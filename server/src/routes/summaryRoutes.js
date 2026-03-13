const express = require('express');
const router = express.Router();
const optionalAuthMiddleware = require('../middleware/optionalAuth');
const { upload, processFile } = require('../controllers/summaryController');

// Use optional auth - works with or without login
router.post('/upload', optionalAuthMiddleware, upload.single('file'), processFile);

module.exports = router;