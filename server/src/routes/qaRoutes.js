const express = require('express');
const authMiddleware = require('../middleware/auth');
const qaController = require('../controllers/qaController');

const router = express.Router();

router.post('/ask', authMiddleware, qaController.askQuestion);

module.exports = router;
