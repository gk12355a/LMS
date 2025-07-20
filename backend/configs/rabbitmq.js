import amqp from 'amqplib';

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    console.log('✅ RabbitMQ connected successfully');

    // Handle connection events
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('🔌 RabbitMQ connection closed');
    });

    // Declare queues
    await declareQueues();

    return { connection, channel };
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

const declareQueues = async () => {
  if (!channel) return;

  try {
    // Email notification queue
    await channel.assertQueue('email_notifications', {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours TTL
      }
    });

    // Course enrollment queue
    await channel.assertQueue('course_enrollment', {
      durable: true
    });

    // Payment processing queue
    await channel.assertQueue('payment_processing', {
      durable: true
    });

    // Video processing queue (for future use)
    await channel.assertQueue('video_processing', {
      durable: true
    });

    console.log('📋 RabbitMQ queues declared successfully');
  } catch (error) {
    console.error('❌ Error declaring queues:', error);
  }
};

// Publisher functions
export const publishToQueue = async (queueName, message) => {
  try {
    if (!channel) {
      console.error('RabbitMQ channel not available');
      return false;
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    await channel.sendToQueue(queueName, messageBuffer, {
      persistent: true,
      timestamp: Date.now()
    });

    console.log(`📤 Message sent to queue ${queueName}:`, message);
    return true;
  } catch (error) {
    console.error(`❌ Error publishing to queue ${queueName}:`, error);
    return false;
  }
};

// Consumer setup
export const consumeFromQueue = async (queueName, callback) => {
  try {
    if (!channel) {
      console.error('RabbitMQ channel not available');
      return;
    }

    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
          console.log(`✅ Message processed from queue ${queueName}`);
        } catch (error) {
          console.error(`❌ Error processing message from ${queueName}:`, error);
          channel.nack(msg, false, false); // Don't requeue failed messages
        }
      }
    });

    console.log(`👂 Listening to queue: ${queueName}`);
  } catch (error) {
    console.error(`❌ Error setting up consumer for ${queueName}:`, error);
  }
};

// Helper functions for specific use cases
export const sendEmailNotification = async (emailData) => {
  return await publishToQueue('email_notifications', {
    type: 'email',
    to: emailData.to,
    subject: emailData.subject,
    body: emailData.body,
    template: emailData.template || 'default',
    data: emailData.data || {}
  });
};

export const sendCourseEnrollmentNotification = async (enrollmentData) => {
  return await publishToQueue('course_enrollment', {
    type: 'enrollment',
    userId: enrollmentData.userId,
    courseId: enrollmentData.courseId,
    courseName: enrollmentData.courseName,
    timestamp: new Date().toISOString()
  });
};

export const sendPaymentProcessingNotification = async (paymentData) => {
  return await publishToQueue('payment_processing', {
    type: 'payment',
    userId: paymentData.userId,
    courseId: paymentData.courseId,
    amount: paymentData.amount,
    paymentId: paymentData.paymentId,
    timestamp: new Date().toISOString()
  });
};

export const getChannel = () => channel;
export const getConnection = () => connection;

export default connectRabbitMQ;
