import express from 'express';
import {
  getAllCourses,
  getCourseById,
  updateCourseById,
  deleteCourseById
} from '../controllers/courseController.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { sendToQueue } from '../configs/rabbitmq.js';

const courseRouter = express.Router();

// Apply caching middleware to GET routes (5 second TTL)
courseRouter.get('/all', cacheMiddleware(5), getAllCourses);
courseRouter.get('/:id', cacheMiddleware(5), getCourseById);

// POST/PUT/DELETE routes with RabbitMQ notifications
courseRouter.put('/:id', updateCourseById, async (req, res, next) => {
  // Send notification after successful update
  if (res.locals.success !== false) {
    await sendToQueue('course_updated', {
      courseId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

courseRouter.delete('/:id', deleteCourseById, async (req, res, next) => {
  // Send notification after successful deletion
  if (res.locals.success !== false) {
    await sendToQueue('course_deleted', {
      courseId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

export default courseRouter;
