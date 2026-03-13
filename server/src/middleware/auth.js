const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('[AUTH] Authorization header:', authHeader ? 'Present' : 'MISSING');
    
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      console.log('[AUTH] ❌ No token provided in request');
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('[AUTH] Token found, verifying...');
    console.log('[AUTH] Token length:', token.length);
    console.log('[AUTH] JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    console.log('[AUTH] ✅ Token verified, userId:', req.userId);
    next();
  } catch (error) {
    console.log('[AUTH] ❌ Token verification failed:');
    console.log('[AUTH] Error type:', error.name);
    console.log('[AUTH] Error message:', error.message);
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

module.exports = authMiddleware;
