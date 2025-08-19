import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import { cacheGet, cacheSet, cacheDel } from "../configs/redis.js";
import { sendToQueue } from "../configs/rabbitmq.js";

// update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    // Send notification to queue
    await sendToQueue('role_updated', {
      userId,
      role: 'educator',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//Add new courses with RabbitMQ async processing
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    if (!imageFile) {
      return res.json({ success: false, message: "Thumbnail Not Attached" });
    }

    const parsedCourseData = JSON.parse(courseData);
    parsedCourseData.educator = educatorId;

    // Send to RabbitMQ for async processing
    await sendToQueue('course_creation', {
      educatorId,
      courseData: JSON.stringify(parsedCourseData),
      imagePath: imageFile.path,
      timestamp: new Date().toISOString()
    });

    // Send immediate response
    res.json({ 
      success: true, 
      message: "Course creation initiated. You will be notified when complete." 
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Educator Courses with Redis caching
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const cacheKey = `educator:${educator}:courses`;
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const courses = await Course.find({ educator });
    const response = { success: true, courses };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);
    
    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Educator Dashboard Data with Redis caching
export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const cacheKey = `educator:${educator}:dashboard`;
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const courses = await Course.find({ educator });
    const totalCourses = courses.length;

    const courseIds = courses.map((course) => course._id);

    // Calculate total earnings from purchases
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    });

    const totalEarnings = purchases.reduce(
      (sum, purchase) => sum + purchase.amount,
      0
    );

    const enrolledStudentsData = [];

    for (const course of courses) {
      const students = await User.find(
        {
          _id: { $in: course.enrolledStudents },
        },
        "name imageUrl"
      );

      students.forEach((student) => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student,
        });
      });
    }

    const response = {
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);

    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Enrolled Students Data with Redis caching
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const cacheKey = `educator:${educator}:enrolled-students`;
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const courses = await Course.find({ educator });
    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    }).populate("userId", "name email imageUrl").populate("courseId", "courseTitle");
    
    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    const response = { success: true, enrolledStudents };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);

    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update existing course with RabbitMQ async processing
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseTitle, coursePrice, discount, courseDescription, courseContent } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    const course = await Course.findById(id);
    if (!course) {
      return res.json({ success: false, message: "Course not found" });
    }
    if (course.educator.toString() !== educatorId) {
      return res.json({ success: false, message: "Unauthorized to update this course" });
    }

    // Send to RabbitMQ for async processing
    await sendToQueue('course_update', {
      courseId: id,
      educatorId,
      updateData: {
        courseTitle,
        coursePrice,
        discount,
        courseDescription,
        courseContent
      },
      imagePath: imageFile ? imageFile.path : null,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      message: "Course update initiated. Changes will be applied shortly." 
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};