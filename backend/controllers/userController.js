import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { CourseProgress } from "../models/CourseProgress.js";
import { cacheMiddleware, invalidateUserCache } from '../middlewares/cache.js';
import { cacheGet, cacheSet, cacheDel } from '../configs/redis.js';
import { 
  sendEmailNotification, 
  sendCourseEnrollmentNotification,
  sendPaymentProcessingNotification 
} from '../configs/rabbitmq.js';

// Cache user data for 1 hour
export const getUserData = [
  cacheMiddleware(3600),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.json({ success: false, message: "User Not Found" });
      }

      res.json({ success: true, user });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  }
];

// Cache enrolled courses for 30 minutes
export const userEnrolledCourses = [
  cacheMiddleware(1800),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const userData = await User.findById(userId).populate("enrolledCourses");

      res.json({ success: true, enrolledCourses: userData.enrolledCourses });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  }
];

// Purchase Course with notifications
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

    // Send payment processing notification to RabbitMQ
    await sendPaymentProcessingNotification({
      userId,
      courseId: courseData._id,
      amount: purchaseData.amount,
      paymentId: newPurchase._id,
      courseName: courseData.courseTitle
    });

    // Stripe Gateway Initialize
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    const currency = process.env.CURRENCY || 'usd';

    // Creating line items for Stripe
    const line_items = [
      {
        price_data: {
          currency: currency.toLowerCase(),
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

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update User Course Progress with caching
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;
    
    // Check cache first
    const cacheKey = `progress:${userId}:${courseId}`;
    let progressData = await cacheGet(cacheKey);
    
    if (!progressData) {
      progressData = await CourseProgress.findOne({ userId, courseId });
    }

    if (progressData) {
      if (progressData.lectureCompleted && progressData.lectureCompleted.includes(lectureId)) {
        return res.json({
          success: true,
          message: "Lecture Already Completed",
        });
      }
      
      // Update progress
      if (!progressData.lectureCompleted) {
        progressData.lectureCompleted = [];
      }
      progressData.lectureCompleted.push(lectureId);
      
      // Save to database
      if (progressData._id) {
        await CourseProgress.findByIdAndUpdate(progressData._id, progressData);
      } else {
        const newProgress = await CourseProgress.create({
          userId,
          courseId,
          lectureCompleted: [lectureId],
        });
        progressData = newProgress;
      }
    } else {
      progressData = await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

    // Update cache
    await cacheSet(cacheKey, progressData, 1800); // Cache for 30 minutes

    // Check if course is completed and send notification
    const course = await Course.findById(courseId);
    if (course) {
      const totalLectures = course.courseContent.reduce((total, chapter) => 
        total + chapter.chapterContent.length, 0
      );
      
      if (progressData.lectureCompleted.length === totalLectures) {
        // Course completed - send congratulations email
        const user = await User.findById(userId);
        await sendEmailNotification({
          to: user.email,
          template: 'courseComplete',
          data: {
            name: user.name,
            courseName: course.courseTitle
          }
        });
      }
    }

    res.json({ success: true, message: "Progress Updated" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get user course progress with caching
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId } = req.body;
    
    // Try cache first
    const cacheKey = `progress:${userId}:${courseId}`;
    let progressData = await cacheGet(cacheKey);
    
    if (!progressData) {
      progressData = await CourseProgress.findOne({ userId, courseId });
      if (progressData) {
        await cacheSet(cacheKey, progressData, 1800); // Cache for 30 minutes
      }
    }
    
    res.json({ success: true, progressData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Add User Rating with cache invalidation
export const addUserRating = async (req, res) => {
  const userId = req.auth.userId;
  const { courseId, rating } = req.body;

  if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
    return res.json({ success: false, message: "Invalid Details" });
  }

  try {
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

    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }

    await course.save();

    // Invalidate course cache since rating changed
    await cacheDel(`cache:/api/course*${courseId}*`);
    
    // Send thank you email for rating
    await sendEmailNotification({
      to: user.email,
      subject: 'Thank you for your rating!',
      body: `Hi ${user.name}, thank you for rating "${course.courseTitle}" with ${rating} stars!`
    });

    return res.json({ success: true, message: "Rating added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
