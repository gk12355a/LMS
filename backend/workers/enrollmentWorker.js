import { consumeFromQueue } from '../configs/rabbitmq.js';
import { sendEmailNotification } from '../configs/rabbitmq.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

// Process enrollment message
const processEnrollmentMessage = async (message) => {
  try {
    console.log('📚 Processing enrollment message:', message);

    const { userId, courseId, courseName, timestamp } = message;

    // Get user details for email
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Send enrollment confirmation email
    await sendEmailNotification({
      to: user.email,
      template: 'enrollment',
      data: {
        name: user.name,
        courseName: courseName
      }
    });

    // Log enrollment for analytics (could be sent to another queue)
    console.log(`📊 Enrollment logged: User ${user.name} enrolled in ${courseName} at ${timestamp}`);

    // You could also trigger other actions here:
    // - Update user progress tracking
    // - Send welcome materials
    // - Notify course instructor
    // - Update analytics/reporting

  } catch (error) {
    console.error('❌ Error processing enrollment message:', error);
    throw error;
  }
};

// Start enrollment worker
export const startEnrollmentWorker = async () => {
  try {
    await consumeFromQueue('course_enrollment', processEnrollmentMessage);
    console.log('🔄 Enrollment worker started successfully');
  } catch (error) {
    console.error('❌ Failed to start enrollment worker:', error);
  }
};

export default startEnrollmentWorker;
