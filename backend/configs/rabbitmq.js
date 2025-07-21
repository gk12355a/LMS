import amqp from 'amqplib';

let connection = null;
let channel = null;

// RabbitMQ connection configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://test:test@192.168.23.11:5672';

// Queue names
export const QUEUES = {
  COURSE_CREATION: 'course_creation',
  COURSE_UPDATE: 'course_update',
  COURSE_UPDATED: 'course_updated',
  COURSE_DELETED: 'course_deleted',
  COURSE_PURCHASE_INITIATED: 'course_purchase_initiated',
  COURSE_PROGRESS_UPDATED: 'course_progress_updated',
  COURSE_RATING_ADDED: 'course_rating_added',
  ROLE_UPDATED: 'role_updated',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_EXPIRED: 'checkout_expired',
  EMAIL_NOTIFICATIONS: 'email_notifications'
};

// Connect to RabbitMQ
export async function connectRabbitMQ() {
  try {
    console.log(`🔄 Connecting to RabbitMQ at: ${RABBITMQ_URL.replace(/\/\/.*@/, '//***:***@')}`);
    
    connection = await amqp.connect(RABBITMQ_URL, {
      heartbeat: 60,
      connectionTimeout: 30000,
      socketOptions: {
        timeout: 30000
      }
    });

    channel = await connection.createChannel();
    
    // Set prefetch count for better load balancing
    await channel.prefetch(10);

    // Declare all queues with durability
    for (const queueName of Object.values(QUEUES)) {
      await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000, // 1 hour TTL
          'x-max-retries': 3
        }
      });
      console.log(`✅ Queue declared: ${queueName}`);
    }

    // Handle connection events
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('⚠️ RabbitMQ connection closed');
      // Attempt to reconnect
      setTimeout(connectRabbitMQ, 5000);
    });

    console.log('✅ RabbitMQ connected successfully');
    return { connection, channel };
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error.message);
    
    // Retry connection after 5 seconds
    setTimeout(connectRabbitMQ, 5000);
    throw error;
  }
}

// Send message to queue
export async function sendToQueue(queueName, message, options = {}) {
  try {
    if (!channel) {
      console.warn('⚠️ RabbitMQ channel not available, attempting to reconnect...');
      await connectRabbitMQ();
    }

    const messageBuffer = Buffer.from(JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
      retryCount: 0
    }));

    const success = channel.sendToQueue(queueName, messageBuffer, {
      persistent: true,
      ...options
    });

    if (success) {
      console.log(`📤 Message sent to queue ${queueName}:`, message);
    } else {
      console.warn(`⚠️ Failed to send message to queue ${queueName}`);
    }

    return success;
  } catch (error) {
    console.error(`❌ Error sending message to queue ${queueName}:`, error.message);
    throw error;
  }
}

// Consume messages from queue
export async function consumeFromQueue(queueName, callback, options = {}) {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`📥 Processing message from ${queueName}:`, content);
          
          await callback(content, msg);
          channel.ack(msg);
          
          console.log(`✅ Message processed successfully from ${queueName}`);
        } catch (error) {
          console.error(`❌ Error processing message from ${queueName}:`, error.message);
          
          // Check retry count
          const content = JSON.parse(msg.content.toString());
          const retryCount = content.retryCount || 0;
          
          if (retryCount < 3) {
            // Retry logic
            content.retryCount = retryCount + 1;
            await sendToQueue(queueName, content);
            channel.ack(msg);
            console.log(`🔄 Message requeued for retry (${retryCount + 1}/3)`);
          } else {
            // Max retries reached, send to dead letter queue or log
            console.error(`💀 Max retries reached for message in ${queueName}:`, content);
            channel.nack(msg, false, false);
          }
        }
      }
    }, {
      noAck: false,
      ...options
    });

    console.log(`👂 Started consuming from queue: ${queueName}`);
  } catch (error) {
    console.error(`❌ Error setting up consumer for ${queueName}:`, error.message);
    throw error;
  }
}

// Send email notification
export async function sendEmailNotification(emailData) {
  return await sendToQueue(QUEUES.EMAIL_NOTIFICATIONS, emailData);
}

// Get channel (for advanced usage)
export function getChannel() {
  return channel;
}

// Get connection (for advanced usage)
export function getConnection() {
  return connection;
}

// Close connection gracefully
export async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
      console.log('✅ RabbitMQ channel closed');
    }
    
    if (connection) {
      await connection.close();
      console.log('✅ RabbitMQ connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error.message);
  }
}

// Health check
export async function checkRabbitMQHealth() {
  try {
    if (!connection || !channel) {
      return { status: 'disconnected', message: 'No active connection' };
    }

    // Try to declare a test queue
    await channel.checkQueue(QUEUES.EMAIL_NOTIFICATIONS);
    
    return { 
      status: 'healthy', 
      message: 'RabbitMQ is connected and responsive',
      queues: Object.keys(QUEUES).length
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: error.message 
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Gracefully shutting down RabbitMQ...');
  await closeRabbitMQ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Gracefully shutting down RabbitMQ...');
  await closeRabbitMQ();
  process.exit(0);
});
