import express from 'express';
import {
  getAllCourse,
  getCourseId,
  updateCourseById,
  deleteCourseById
} from '../controllers/courseController.js';

const courseRouter = express.Router();

courseRouter.get('/all', getAllCourse);
courseRouter.get('/:id', getCourseId);
courseRouter.put('/:id', updateCourseById);     // ✅ Thêm route PUT
courseRouter.delete('/:id', deleteCourseById);  // ✅ Thêm route DELETE

export default courseRouter;
