import Redis from 'ioredis';

let redisClient = null;

// Connect to Redis
export const connectRedis = async () => {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || '192.168.23.11',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    redisClient.on('ready', () => {
      console.log('🚀 Redis is ready to use');
    });

    // Test connection
    await redisClient.ping();
    console.log('🏓 Redis ping successful');

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
};

// Get Redis client instance
export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

// Cache helper functions
export const cacheGet = async (key) => {
  try {
    if (!redisClient) return null;
    const value = await redisClient.get(key);
    return value;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    if (!redisClient) return false;
    if (ttlSeconds > 0) {
      await redisClient.setex(key, ttlSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

export const cacheDel = async (key) => {
  try {
    if (!redisClient) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

export const cacheExists = async (key) => {
  try {
    if (!redisClient) return false;
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Redis EXISTS error:', error);
    return false;
  }
};

export const cacheExpire = async (key, ttlSeconds) => {
  try {
    if (!redisClient) return false;
    await redisClient.expire(key, ttlSeconds);
    return true;
  } catch (error) {
    console.error('Redis EXPIRE error:', error);
    return false;
  }
};

export const cacheFlush = async () => {
  try {
    if (!redisClient) return false;
    await redisClient.flushdb();
    console.log('🧹 Redis cache cleared');
    return true;
  } catch (error) {
    console.error('Redis FLUSH error:', error);
    return false;
  }
};

// Graceful shutdown
export const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('👋 Redis connection closed');
    }
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
};

export default connectRedis;
