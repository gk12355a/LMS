import Course from "../models/Course.js";
import { cacheGet, cacheSet, cacheDel } from "../configs/redis.js";

// Get All Courses with Redis caching
export const getAllCourses = async (req, res) => {
  try {
    const cacheKey = 'courses:all:published';
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const courses = await Course.find({ isPublished: true })
      .select(["-courseContent", "-enrolledStudents"])
      .populate({ path: "educator" });

    const response = { success: true, courses };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);
    
    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Course by Id with Redis caching
export const getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const cacheKey = `course:${id}`;
    
    // Try to get from cache first
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // If not in cache, fetch from database
    const courseData = await Course.findById(id).populate({ path: "educator" });

    if (!courseData) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Remove lectureUrl if isPreviewFree is false
    courseData.courseContent.forEach((chapter) => {
      chapter.chapterContent.forEach((lecture) => {
        if (!lecture.isPreviewFree) {
          lecture.lectureUrl = "";
        }
      });
    });

    const response = { success: true, courseData };
    
    // Cache the result with 5-second TTL
    await cacheSet(cacheKey, JSON.stringify(response), 5);

    res.json(response);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update Course by Id with cache invalidation
export const updateCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedCourse = await Course.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Invalidate related caches
    await Promise.all([
      cacheDel(`course:${id}`),
      cacheDel('courses:all:published')
    ]);

    res.json({ success: true, message: "Course updated successfully", updatedCourse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Course by Id with cache invalidation
export const deleteCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCourse = await Course.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Invalidate related caches
    await Promise.all([
      cacheDel(`course:${id}`),
      cacheDel('courses:all:published')
    ]);

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
