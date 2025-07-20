import { consumeFromQueue } from '../configs/rabbitmq.js';
import { sendEmailNotification } from '../configs/rabbitmq.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';

// Process payment message
const processPaymentMessage = async (message) => {
  try {
    console.log('💳 Processing payment message:', message);

    const { userId, courseId, amount, paymentId, courseName, timestamp } = message;

    // Get user and course details
    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    // Send payment confirmation email to user
    await sendEmailNotification({
      to: user.email,
      template: 'payment',
      data: {
        name: user.name,
        courseName: courseName || course.courseTitle,
        amount: amount
      }
    });

    // Send notification to course educator about new enrollment
    const educator = await User.findById(course.educator);
    if (educator) {
      await sendEmailNotification({
        to: educator.email,
        subject: 'New Student Enrolled!',
        body: `Hi ${educator.name}, ${user.name} has just enrolled in your course "${course.courseTitle}" for $${amount}. Welcome your new student!`
      });
    }

    // Log payment for analytics
    console.log(`💰 Payment processed: $${amount} for course "${courseName}" by user ${user.name}`);

    // You could also trigger other actions here:
    // - Update analytics/reporting
    // - Send course materials
    // - Update revenue tracking
    // - Trigger affiliate commissions

  } catch (error) {
    console.error('❌ Error processing payment message:', error);
    throw error;
  }
};

// Start payment worker
export const startPaymentWorker = async () => {
  try {
    await consumeFromQueue('payment_processing', processPaymentMessage);
    console.log('🔄 Payment worker started successfully');
  } catch (error) {
    console.error('❌ Failed to start payment worker:', error);
  }
};

export default startPaymentWorker;
