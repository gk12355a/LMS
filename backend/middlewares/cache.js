import { cacheGet, cacheSet, cacheDel } from '../configs/redis.js';

// Generic cache middleware for GET requests
export const cacheMiddleware = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = `cache:${req.originalUrl}`;
      
      // Try to get from cache
      const cachedData = await cacheGet(cacheKey);
      if (cachedData) {
        console.log(`🎯 Cache hit for: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      // If not in cache, modify res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        cacheSet(cacheKey, JSON.stringify(data), ttlSeconds)
          .then(() => {
            console.log(`💾 Cached response for: ${cacheKey} (TTL: ${ttlSeconds}s)`);
          })
          .catch(err => {
            console.error('Cache set error:', err);
          });
        
        // Send the original response
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching
    }
  };
};

// User-specific cache middleware
export const userCacheMiddleware = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return next();
      }

      const cacheKey = `user:${userId}:${req.originalUrl}`;
      
      const cachedData = await cacheGet(cacheKey);
      if (cachedData) {
        console.log(`🎯 User cache hit for: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      const originalJson = res.json;
      res.json = function(data) {
        cacheSet(cacheKey, JSON.stringify(data), ttlSeconds)
          .then(() => {
            console.log(`💾 User cached response for: ${cacheKey} (TTL: ${ttlSeconds}s)`);
          })
          .catch(err => {
            console.error('User cache set error:', err);
          });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('User cache middleware error:', error);
      next();
    }
  };
};

// Cache invalidation helpers
export const invalidateCoursesCache = async () => {
  try {
    await cacheDel('courses:all:published');
    console.log('🧹 Courses cache invalidated');
  } catch (error) {
    console.error('Error invalidating courses cache:', error);
  }
};

export const invalidateEducatorCache = async (educatorId) => {
  try {
    await Promise.all([
      cacheDel(`educator:${educatorId}:courses`),
      cacheDel(`educator:${educatorId}:dashboard`),
      cacheDel(`educator:${educatorId}:enrolled-students`)
    ]);
    console.log(`🧹 Educator cache invalidated for: ${educatorId}`);
  } catch (error) {
    console.error('Error invalidating educator cache:', error);
  }
};

export const invalidateUserCache = async (userId) => {
  try {
    await Promise.all([
      cacheDel(`user:${userId}:data`),
      cacheDel(`user:${userId}:enrolled-courses`)
    ]);
    console.log(`🧹 User cache invalidated for: ${userId}`);
  } catch (error) {
    console.error('Error invalidating user cache:', error);
  }
};

export const invalidateCourseCache = async (courseId) => {
  try {
    await Promise.all([
      cacheDel(`course:${courseId}`),
      cacheDel('courses:all:published')
    ]);
    console.log(`🧹 Course cache invalidated for: ${courseId}`);
  } catch (error) {
    console.error('Error invalidating course cache:', error);
  }
};

// Rate limiting middleware
export const rateLimitMiddleware = (windowSeconds = 60, maxRequests = 10) => {
  return async (req, res, next) => {
    try {
      const userId = req.auth?.userId || req.ip;
      const key = `rate_limit:${userId}:${req.route?.path || req.path}`;
      
      const current = await cacheGet(key);
      const requests = current ? parseInt(current) : 0;
      
      if (requests >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          retryAfter: windowSeconds
        });
      }
      
      // Increment counter
      await cacheSet(key, (requests + 1).toString(), windowSeconds);
      
      // Add headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - requests - 1),
        'X-RateLimit-Reset': new Date(Date.now() + windowSeconds * 1000).toISOString()
      });
      
      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      next(); // Continue without rate limiting
    }
  };
};
