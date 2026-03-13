const express = require('express');
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
