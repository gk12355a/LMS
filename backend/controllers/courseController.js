import Course from '../models/Course.js';
import { cacheMiddleware, invalidateCoursesCache } from '../middlewares/cache.js';
import { sendCourseEnrollmentNotification } from '../configs/rabbitmq.js';

// Apply cache middleware to GET routes
export const getAllCourses = [
  cacheMiddleware(1800), // Cache for 30 minutes
  async (req, res) => {
    try {
      const courses = await Course.find({ isPublished: true })
        .select(["-courseContent", "-enrolledStudents"])
        .populate({ path: "educator" });

      res.json({ success: true, courses });
    } catch (error) {
      res.json({ success: false, message: error.message });
      // Handle error
    }
  }
];

export const getCourseById = [
  cacheMiddleware(3600), // Cache for 1 hour
  async (req, res) => {
    try {
      const { id } = req.params;
      const courseData = await Course.findById(id).populate({ path: "educator" });

      // Remove lectureUrl if isPreviewFree is false
      courseData.courseContent.forEach((chapter) => {
        chapter.chapterContent.forEach((lecture) => {
          if (!lecture.isPreviewFree) {
            lecture.lectureUrl = "";
          }
        });
      });

      res.json({ success: true, courseData });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  }
];

export const updateCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedCourse = await Course.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Invalidate related caches
    await invalidateCoursesCache();

    res.json({ success: true, message: "Course updated successfully", updatedCourse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCourse = await Course.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Invalidate related caches
    await invalidateCoursesCache();

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
