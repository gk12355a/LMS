import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js"

// update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//Add new courses
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

    res.json({ success: true, message: "Course Added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ educator });
    res.json({ success: true, courses });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Educator Dashboard Data (Total Earning, Enrolled Students, No. of Courses)
export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;
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

    res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
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
};


// Update existing course
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

    res.json({ success: true, message: "Course updated successfully", course });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};