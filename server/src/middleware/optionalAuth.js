const jwt = require('jsonwebtoken');

/**
 * Optional authentication middleware
 * Tries to extract userId from JWT token if present, but doesn't require it
 * Allows the request to continue even if no token is provided
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('[OPTIONAL-AUTH] Authorization header:', authHeader ? 'Present' : 'Not present (OK)');
    
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      console.log('[OPTIONAL-AUTH] No token - continuing without authentication');
      req.userId = null;
      return next();
    }

    console.log('[OPTIONAL-AUTH] Token found, attempting verification...');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      console.log('[OPTIONAL-AUTH] ✅ Token verified, userId:', req.userId);
    } catch (verifyError) {
      console.log('[OPTIONAL-AUTH] Token verification failed:', verifyError.message);
      console.log('[OPTIONAL-AUTH] Continuing without authentication');
      req.userId = null;
    }
    
    next();
  } catch (error) {
    console.error('[OPTIONAL-AUTH] Unexpected error:', error);
    req.userId = null;
    next();
  }
};

module.exports = optionalAuthMiddleware;
