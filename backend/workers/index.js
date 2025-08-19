import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '../.env' });
import mongoose from 'mongoose';
import { connectRabbitMQ, consumeFromQueue, QUEUES, closeRabbitMQ } from '../configs/rabbitmq.js';
import { connectRedis } from '../configs/redis.js';
import connectDB from '../configs/mongodb.js';
import connectCloudinary from '../configs/cloudinary.js';
import { 
  processCourseCreation,
  processCourseUpdate,
  processPaymentSuccess,
  processCourseProgress,
  processCourseRating,
  processUserCreated,
  processUserUpdated,
  processUserDeleted,
  processRoleUpdated,
  processEmailNotification
} from './courseWorker.js';

// Initialize workers
async function startWorkers(attempt = 1, maxAttempts = 3) {
  try {
    console.log(`🚀 Starting RabbitMQ workers (Attempt ${attempt}/${maxAttempts})...`);

    // Connect to MongoDB
    await connectDB();
    console.log('✅ MongoDB connected for workers');

    // Configure Cloudinary
    await connectCloudinary();
    console.log('✅ Cloudinary configured for workers');

    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected for workers');

    // Connect to RabbitMQ
    await connectRabbitMQ();
    console.log('✅ RabbitMQ connected for workers');

    // Start all consumers
    const consumers = [
      { queue: QUEUES.COURSE_CREATION, processor: processCourseCreation },
      { queue: QUEUES.COURSE_UPDATE, processor: processCourseUpdate },
      { queue: QUEUES.COURSE_UPDATED, processor: processCourseUpdate },
      { queue: QUEUES.COURSE_DELETED, processor: processCourseUpdate },
      { queue: QUEUES.COURSE_PURCHASE_INITIATED, processor: processPaymentSuccess },
      { queue: QUEUES.COURSE_PROGRESS_UPDATED, processor: processCourseProgress },
      { queue: QUEUES.COURSE_RATING_ADDED, processor: processCourseRating },
      { queue: QUEUES.ROLE_UPDATED, processor: processRoleUpdated },
      { queue: QUEUES.USER_CREATED, processor: processUserCreated },
      { queue: QUEUES.USER_UPDATED, processor: processUserUpdated },
      { queue: QUEUES.USER_DELETED, processor: processUserDeleted },
      { queue: QUEUES.PAYMENT_SUCCEEDED, processor: processPaymentSuccess },
      { queue: QUEUES.PAYMENT_FAILED, processor: processPaymentSuccess },
      { queue: QUEUES.CHECKOUT_COMPLETED, processor: processPaymentSuccess },
      { queue: QUEUES.CHECKOUT_EXPIRED, processor: processPaymentSuccess },
      { queue: QUEUES.EMAIL_NOTIFICATIONS, processor: processEmailNotification }
    ];

    for (const { queue, processor } of consumers) {
      try {
        await consumeFromQueue(queue, processor);
        console.log(`✅ Consumer started for queue: ${queue}`);
      } catch (error) {
        console.error(`❌ Failed to start consumer for ${queue}:`, error.message);
      }
    }

    console.log('🎉 All workers started successfully!');
    console.log(`📊 Total consumers: ${consumers.length}`);
  } catch (error) {
    console.error('❌ Failed to start workers:', error.message);
    if (attempt < maxAttempts) {
      console.error(`🔄 Retrying in 10 seconds (Attempt ${attempt + 1}/${maxAttempts})...`);
      setTimeout(() => startWorkers(attempt + 1, maxAttempts), 10000);
    } else {
      console.error('❌ Max retry attempts reached. Exiting...');
      process.exit(1);
    }
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log('🔄 Shutting down workers gracefully...');
  try {
    await closeRabbitMQ();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    }
    console.log('✅ Workers shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start the workers
startWorkers();