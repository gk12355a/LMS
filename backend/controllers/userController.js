import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { CourseProgress } from "../models/CourseProgress.js";
import { cacheGet, cacheSet, cacheDel } from "../configs/redis.js";
import { sendToQueue } from "../configs/rabbitmq.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// Get User Data with Redis caching
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const cacheKey = `user:${userId}:data`;
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User Not Found" });
    }

    const response = { success: true, user };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);

    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Users Enrolled Courses With Lecture Links with Redis caching
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const cacheKey = `user:${userId}:enrolled-courses`;
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const userData = await User.findById(userId).populate("enrolledCourses");
    const response = { success: true, enrolledCourses: userData.enrolledCourses };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);

    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Purchase Course with RabbitMQ async processing
export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const { origin } = req.headers;
    const userId = req.auth.userId;
    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: "Data Not Found" });
    }

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: (
        courseData.coursePrice -
        (courseData.discount * courseData.coursePrice) / 100
      ).toFixed(2),
    };

    const newPurchase = await Purchase.create(purchaseData);

    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: courseData.courseTitle,
          },
          unit_amount: Math.floor(newPurchase.amount) * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        purchaseId: newPurchase._id.toString(),
      },
    });

    // Send to RabbitMQ for async processing
    await sendToQueue('course_purchase_initiated', {
      userId,
      courseId,
      purchaseId: newPurchase._id.toString(),
      amount: newPurchase.amount,
      sessionId: session.id,
      timestamp: new Date().toISOString()
    });

    // Store amount in res.locals for potential RabbitMQ notification
    res.locals.amount = newPurchase.amount;

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update User Course Progress with RabbitMQ async processing
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.json({
          success: true,
          message: "Lecture Already Completed",
        });
      }
      progressData.lectureCompleted.push(lectureId);
      await progressData.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

    // Send to RabbitMQ for async processing (notifications, analytics, etc.)
    await sendToQueue('course_progress_updated', {
      userId,
      courseId,
      lectureId,
      completedLectures: progressData ? progressData.lectureCompleted.length : 1,
      timestamp: new Date().toISOString()
    });

    // Invalidate user's enrolled courses cache
    await cacheDel(`user:${userId}:enrolled-courses`);

    res.json({ success: true, message: "Progress Updated" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get User Course Progress with Redis caching
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId } = req.body;
    const cacheKey = `user:${userId}:progress:${courseId}`;
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const progressData = await CourseProgress.findOne({ userId, courseId });
    const response = { success: true, progressData };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);

    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Add User Ratings to Course with rate limiting and RabbitMQ async processing
export const addUserRating = async (req, res) => {
  const userId = req.auth.userId;
  const { courseId, rating } = req.body;

  if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
    return res.json({ success: false, message: "Invalid Details" });
  }

  try {
    // Rate limiting: Check if user has rated this course in the last 60 seconds
    const rateLimitKey = `rate_limit:rating:${userId}:${courseId}`;
    const lastRating = await cacheGet(rateLimitKey);
    
    if (lastRating) {
      return res.json({ 
        success: false, 
        message: "Please wait before rating this course again" 
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.json({ success: false, message: "Course not found." });
    }
    const user = await User.findById(userId);

    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.json({
        success: false,
        message: "User has not purchased this course.",
      });
    }

    const existingRatingIndex = course.courseRatings.findIndex(
      (r) => r.userId === userId
    );

    const isNewRating = existingRatingIndex === -1;
    const oldRating = isNewRating ? null : course.courseRatings[existingRatingIndex].rating;

    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }

    await course.save();

    // Send to RabbitMQ for async processing (notifications, analytics, etc.)
    await sendToQueue('course_rating_added', {
      userId,
      courseId,
      rating,
      oldRating,
      isNewRating,
      timestamp: new Date().toISOString()
    });

    // Set rate limit (60 seconds)
    await cacheSet(rateLimitKey, "rated", 60);

    // Invalidate related caches
    await cacheDel(`course:${courseId}`);

    return res.json({ success: true, message: "Rating added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
