import { cacheGet, cacheSet } from '../configs/redis.js';

// Cache middleware for GET requests
export const cacheMiddleware = (expireInSeconds = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
      const cachedData = await cacheGet(cacheKey);

      if (cachedData) {
        console.log(`🎯 Cache HIT for: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`❌ Cache MISS for: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response data
        cacheSet(cacheKey, data, expireInSeconds);
        console.log(`💾 Data cached for: ${cacheKey}`);
        
        // Call original json function
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Cache invalidation helper
export const invalidateCache = async (pattern) => {
  try {
    const { getRedisClient } = await import('../configs/redis.js');
    const client = getRedisClient();
    
    if (!client) return false;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`🗑️ Invalidated ${keys.length} cache entries matching: ${pattern}`);
    }
    return true;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return false;
  }
};

// Specific cache invalidation functions
export const invalidateCoursesCache = () => invalidateCache('cache:/api/course*');
export const invalidateUserCache = (userId) => invalidateCache(`cache:/api/user*${userId}*`);
export const invalidateEducatorCache = (educatorId) => invalidateCache(`cache:/api/educator*${educatorId}*`);
