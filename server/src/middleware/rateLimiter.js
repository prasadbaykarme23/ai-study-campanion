/**
 * Simple in-memory rate limiter
 * Limits requests per IP address
 */
const rateLimitStore = new Map();

/**
 * Create a rate limiter middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {string} message - Error message to return
 */
const createRateLimiter = (windowMs, maxRequests, message = 'Too many requests, please try again later.') => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    
    // Get or create request log for this IP+path
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }
    
    const requestLog = rateLimitStore.get(key);
    
    // Remove expired entries
    const validRequests = requestLog.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const retryAfter = Math.ceil((windowMs - (now - oldestRequest)) / 1000);
      
      console.log(`[RATE-LIMIT] ⛔ Request blocked for ${ip} on ${req.path}`);
      console.log(`[RATE-LIMIT] 📊 ${validRequests.length}/${maxRequests} requests in last ${Math.round(windowMs/1000)}s window`);
      console.log(`[RATE-LIMIT] ⏰ Retry after: ${retryAfter} seconds`);
      
      return res.status(429).json({
        message,
        retryAfter: `${retryAfter} seconds`,
        error: 'Rate limit exceeded'
      });
    }
    
    // Add current request
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);
    
    console.log(`[RATE-LIMIT] ✅ Request allowed for ${ip} on ${req.path} (${validRequests.length}/${maxRequests})`);
    
    next();
  };
};

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < maxAge);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }
  
  console.log(`[RATE-LIMIT] Cleanup: ${rateLimitStore.size} tracked IPs`);
}, 5 * 60 * 1000);

module.exports = { createRateLimiter };
