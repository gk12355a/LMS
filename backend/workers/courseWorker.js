import Course from '../models/Course.js';
import { v2 as cloudinary } from 'cloudinary';
import { invalidateCoursesCache, invalidateEducatorCache } from '../middlewares/cache.js';
import { sendEmailNotification } from '../configs/rabbitmq.js';
import { cacheDel } from '../configs/redis.js';
import User from '../models/User.js';

// Process course creation from RabbitMQ queue
export const processCourseCreation = async (message) => {
  try {
    const { educatorId, courseData, imagePath, timestamp } = message;
    const parsedData = JSON.parse(courseData);
    
    console.log(`🔄 Processing course creation for educator ${educatorId}`);
    
    // Create course in database
    const course = await Course.create({
      ...parsedData,
      educator: educatorId
    });
    
    // Upload image to Cloudinary
    const imageUpload = await cloudinary.uploader.upload(imagePath);
    course.courseThumbnail = imageUpload.secure_url;
    await course.save();

    // Invalidate related caches
    await Promise.all([
      cacheDel('courses:all:published'),
      cacheDel(`educator:${educatorId}:courses`),
      cacheDel(`educator:${educatorId}:dashboard`)
    ]);

    // Send email notification to educator
    await sendEmailNotification({
      to: educatorId, 
      template: 'course_created',
      data: { 
        courseId: course._id,
        courseTitle: course.courseTitle,
        timestamp 
      }
    });

    console.log(`✅ Course created successfully: ${course._id}`);
    return { success: true, courseId: course._id };
  } catch (error) {
    console.error('❌ Course creation failed:', error);
    throw error;
  }
};

// Process course update from RabbitMQ queue
export const processCourseUpdate = async (message) => {
  try {
    const { courseId, educatorId, updateData, imagePath, timestamp } = message;
    
    console.log(`🔄 Processing course update for course ${courseId}`);
    
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Update basic fields
    const { courseTitle, coursePrice, discount, courseDescription, courseContent } = updateData;
    
    if (courseTitle) course.courseTitle = courseTitle;
    if (coursePrice) course.coursePrice = coursePrice;
    if (discount !== undefined) course.discount = discount;
    if (courseDescription) course.courseDescription = courseDescription;

    // Update course content with proper structure
    if (courseContent) {
      course.courseContent = JSON.parse(courseContent).map((chapter, chapterIndex) => ({
        ...chapter,
        chapterOrder: chapterIndex + 1,
        chapterContent: chapter.chapterContent.map((lecture, lectureIndex) => ({
          ...lecture,
          lectureOrder: lectureIndex + 1,
          lectureId: lecture.lectureId || `lec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })),
        chapterId: chapter.chapterId || `chap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
    }

    // Update thumbnail if new image is provided
    if (imagePath) {
      const imageUpload = await cloudinary.uploader.upload(imagePath);
      course.courseThumbnail = imageUpload.secure_url;
    }

    await course.save();

    // Invalidate related caches
    await Promise.all([
      cacheDel(`course:${courseId}`),
      cacheDel('courses:all:published'),
      cacheDel(`educator:${educatorId}:courses`),
      cacheDel(`educator:${educatorId}:dashboard`),
      cacheDel(`educator:${educatorId}:enrolled-students`)
    ]);

    // Send email notification to educator
    await sendEmailNotification({
      to: educatorId,
      template: 'course_updated',
      data: {
        courseId,
        courseTitle: course.courseTitle,
        timestamp
      }
    });

    console.log(`✅ Course updated successfully: ${courseId}`);
    return { success: true, courseId };
  } catch (error) {
    console.error('❌ Course update failed:', error);
    throw error;
  }
};

// Process payment success notifications
export const processPaymentSuccess = async (message) => {
  try {
    const { purchaseId, userId, courseId, amount, timestamp } = message;
    
    console.log(`🔄 Processing payment success for purchase ${purchaseId}`);
    
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    
    if (user && course) {
      // Send welcome email to student
      await sendEmailNotification({
        to: userId,
        template: 'course_enrollment_success',
        data: {
          userName: user.name,
          courseTitle: course.courseTitle,
          amount,
          timestamp
        }
      });

      // Send notification to educator
      await sendEmailNotification({
        to: course.educator,
        template: 'new_student_enrolled',
        data: {
          studentName: user.name,
          courseTitle: course.courseTitle,
          amount,
          timestamp
        }
      });

      // Invalidate related caches
      await Promise.all([
        cacheDel(`user:${userId}:enrolled-courses`),
        cacheDel(`user:${userId}:data`),
        cacheDel(`educator:${course.educator}:dashboard`),
        cacheDel(`educator:${course.educator}:enrolled-students`)
      ]);
    }

    console.log(`✅ Payment success processed for purchase ${purchaseId}`);
    return { success: true, purchaseId };
  } catch (error) {
    console.error('❌ Payment success processing failed:', error);
    throw error;
  }
};

// Process course progress updates
export const processCourseProgress = async (message) => {
  try {
    const { userId, courseId, lectureId, completedLectures, timestamp } = message;
    
    console.log(`🔄 Processing progress update for user ${userId}, course ${courseId}`);
    
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    
    if (user && course) {
      // Check if course is completed (assuming 80% completion threshold)
      const totalLectures = course.courseContent.reduce((total, chapter) => 
        total + chapter.chapterContent.length, 0
      );
      
      const completionPercentage = (completedLectures / totalLectures) * 100;
      
      if (completionPercentage >= 80) {
        // Send course completion notification
        await sendEmailNotification({
          to: userId,
          template: 'course_completion',
          data: {
            userName: user.name,
            courseTitle: course.courseTitle,
            completionPercentage: Math.round(completionPercentage),
            timestamp
          }
        });
      }

      // Invalidate progress cache
      await cacheDel(`user:${userId}:progress:${courseId}`);
    }

    console.log(`✅ Progress update processed for user ${userId}`);
    return { success: true, userId, courseId };
  } catch (error) {
    console.error('❌ Progress update processing failed:', error);
    throw error;
  }
};

// Process course rating notifications
export const processCourseRating = async (message) => {
  try {
    const { userId, courseId, rating, isNewRating, timestamp } = message;
    
    console.log(`🔄 Processing rating ${rating} for course ${courseId}`);
    
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    
    if (user && course) {
      // Send notification to educator about new rating
      await sendEmailNotification({
        to: course.educator,
        template: 'course_rating_received',
        data: {
          studentName: user.name,
          courseTitle: course.courseTitle,
          rating,
          isNewRating,
          timestamp
        }
      });

      // Invalidate course cache to refresh rating data
      await cacheDel(`course:${courseId}`);
    }

    console.log(`✅ Rating processed for course ${courseId}`);
    return { success: true, courseId, rating };
  } catch (error) {
    console.error('❌ Rating processing failed:', error);
    throw error;
  }
};

// Process user lifecycle events
export const processUserCreated = async (message) => {
  try {
    const { userId, name, email, timestamp } = message;
    
    console.log(`🔄 Processing user created event for user ${userId}`);
    
    await sendEmailNotification({
      to: email,
      template: 'welcome_new_user',
      data: {
        userName: name,
        timestamp
      }
    });

    console.log(`✅ User created event processed: ${userId}`);
    return { success: true, userId };
  } catch (error) {
    console.error('❌ User created event processing failed:', error);
    throw error;
  }
};

export const processUserUpdated = async (message) => {
  try {
    const { userId, changes, timestamp } = message;
    
    console.log(`🔄 Processing user updated event for user ${userId}`);
    
    // Invalidate user cache
    await cacheDel(`user:${userId}:data`);
    
    console.log(`✅ User updated event processed: ${userId}`);
    return { success: true, userId };
  } catch (error) {
    console.error('❌ User updated event processing failed:', error);
    throw error;
  }
};

export const processUserDeleted = async (message) => {
  try {
    const { userId, timestamp } = message;
    
    console.log(`🔄 Processing user deleted event for user ${userId}`);
    
    // Clean up user-related caches
    await Promise.all([
      cacheDel(`user:${userId}:data`),
      cacheDel(`user:${userId}:enrolled-courses`),
      cacheDel(`user:${userId}:progress:*`)
    ]);
    
    console.log(`✅ User deleted event processed: ${userId}`);
    return { success: true, userId };
  } catch (error) {
    console.error('❌ User deleted event processing failed:', error);
    throw error;
  }
};

export const processRoleUpdated = async (message) => {
  try {
    const { userId, role, email, timestamp } = message;
    
    console.log(`🔄 Processing role update for user ${userId} to ${role}`);
    
    if (role === 'educator') {
      await sendEmailNotification({
        to: email,
        template: 'educator_role_granted',
        data: {
          timestamp
        }
      });
    }
    
    // Invalidate user cache
    await cacheDel(`user:${userId}:data`);
    
    console.log(`✅ Role update processed: ${userId} -> ${role}`);
    return { success: true, userId, role };
  } catch (error) {
    console.error('❌ Role update processing failed:', error);
    throw error;
  }
};

export const processEmailNotification = async (message) => {
  try {
    const { to, template, data, timestamp } = message;
    
    console.log(`🔄 Processing email notification: ${template} to ${to}`);
    
    // Here you would integrate with your email service (SendGrid, Nodemailer, etc.)
    // For now, we'll just log the email data
    console.log(`📧 Email Details:`, {
      to,
      template,
      data,
      timestamp
    });
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`✅ Email notification sent: ${template}`);
    return { success: true, template, to };
  } catch (error) {
    console.error('❌ Email notification processing failed:', error);
    throw error;
  }
};

// Process user lifecycle events (legacy function for backward compatibility)
export const processUserEvent = async (message) => {
  try {
    const { type, userId, timestamp } = message;
    
    console.log(`🔄 Processing user event: ${type} for user ${userId}`);
    
    switch (type) {
      case 'user_created':
        return await processUserCreated(message);
        
      case 'user_updated':
        return await processUserUpdated(message);
        
      case 'user_deleted':
        return await processUserDeleted(message);
        
      case 'role_updated':
        return await processRoleUpdated(message);
        
      default:
        console.warn(`⚠️ Unknown user event type: ${type}`);
        return { success: false, error: 'Unknown event type' };
    }
  } catch (error) {
    console.error('❌ User event processing failed:', error);
    throw error;
  }
};
