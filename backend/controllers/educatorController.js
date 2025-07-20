import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import { cacheMiddleware, invalidateEducatorCache, invalidateCoursesCache } from '../middlewares/cache.js';
import { cacheGet, cacheSet, cacheDel } from '../configs/redis.js';
import { sendEmailNotification } from '../configs/rabbitmq.js';

// Update role to educator with welcome email
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    // Get user details for welcome email
    const user = await User.findById(userId);
    if (user) {
      await sendEmailNotification({
        to: user.email,
        template: 'welcome',
        data: {
          name: user.name
        }
      });
    }

    // Invalidate user cache
    await invalidateEducatorCache(userId);

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Add new courses with notifications
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    if (!imageFile) {
      return res.json({ success: false, message: "Thumbnail Not Attached" });
    }

    const parsedCourseData = await JSON.parse(courseData);
    parsedCourseData.educator = educatorId;
    const newCourse = await Course.create(parsedCourseData);
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);
    newCourse.courseThumbnail = imageUpload.secure_url;
    await newCourse.save();

    // Invalidate related caches
    await invalidateCoursesCache();
    await invalidateEducatorCache(educatorId);

    // Send course creation notification
    const educator = await User.findById(educatorId);
    if (educator) {
      await sendEmailNotification({
        to: educator.email,
        subject: 'Course Created Successfully!',
        body: `Hi ${educator.name}, your course "${newCourse.courseTitle}" has been created successfully and is now live on the platform.`
      });
    }

    res.json({ success: true, message: "Course Added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Educator Courses with caching
export const getEducatorCourses = [
  cacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
    try {
      const educator = req.auth.userId;
      const courses = await Course.find({ educator });
      res.json({ success: true, courses });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  }
];

// Get Educator Dashboard Data with caching
export const educatorDashboardData = [
  cacheMiddleware(900), // Cache for 15 minutes (more dynamic data)
  async (req, res) => {
    try {
      const educator = req.auth.userId;
      
      // Try to get from cache first
      const cacheKey = `dashboard:${educator}`;
      let dashboardData = await cacheGet(cacheKey);
      
      if (!dashboardData) {
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

        // Collect unique enrolled student IDs with their course titles
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

        dashboardData = {
          totalEarnings,
          enrolledStudentsData,
          totalCourses,
        };

        // Cache the dashboard data
        await cacheSet(cacheKey, dashboardData, 900); // Cache for 15 minutes
      }

      res.json({
        success: true,
        dashboardData,
      });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  }
];

// Get Enrolled Students Data with caching
export const getEnrolledStudentsData = [
  cacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
    try {
      const educator = req.auth.userId;
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

      res.json({ success: true, enrolledStudents });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  }
];

// Update existing course with cache invalidation
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

    // Store old course title for notification
    const oldCourseTitle = course.courseTitle;

    // Update basic fields
    if (courseTitle) course.courseTitle = courseTitle;
    if (coursePrice) course.coursePrice = coursePrice;
    if (discount) course.discount = discount;
    if (courseDescription) course.courseDescription = courseDescription;

    // Update or add course content (chapters and lectures)
    if (courseContent) {
      course.courseContent = courseContent.map(chapter => ({
        ...chapter,
        chapterContent: chapter.chapterContent.map(lecture => ({
          ...lecture,
          lectureId: lecture.lectureId || `lec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          chapterId: chapter.chapterId || `chap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      }));
    }

    // Update thumbnail if new image is provided
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path);
      course.courseThumbnail = imageUpload.secure_url;
    }

    await course.save();

    // Invalidate related caches
    await invalidateCoursesCache();
    await invalidateEducatorCache(educatorId);
    await cacheDel(`dashboard:${educatorId}`);

    // Send update notification to enrolled students if course title changed
    if (courseTitle && courseTitle !== oldCourseTitle) {
      const enrolledStudents = await User.find({
        _id: { $in: course.enrolledStudents }
      });

      // Send notifications to all enrolled students
      for (const student of enrolledStudents) {
        await sendEmailNotification({
          to: student.email,
          subject: 'Course Updated!',
          body: `Hi ${student.name}, the course "${oldCourseTitle}" has been updated and is now called "${courseTitle}". Check out the new content!`
        });
      }
    }

    // Send confirmation to educator
    const educator = await User.findById(educatorId);
    if (educator) {
      await sendEmailNotification({
        to: educator.email,
        subject: 'Course Updated Successfully!',
        body: `Hi ${educator.name}, your course "${course.courseTitle}" has been updated successfully.`
      });
    }

    res.json({ success: true, message: "Course updated successfully", course });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};