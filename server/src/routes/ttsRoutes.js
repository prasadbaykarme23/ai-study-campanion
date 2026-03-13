const express = require('express');
const { sampleSpeech } = require('../controllers/ttsController');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const router = express.Router();

const ttsPreviewLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => {
		const userId = req.user?.id || req.user?._id;
		return userId ? `user:${userId}` : ipKeyGenerator(req.ip);
	},
	handler: (req, res) => {
		const retryAfterSeconds = Math.max(1, Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 60);
		res.set('Retry-After', String(retryAfterSeconds));
		return res.status(429).json({
			message: 'Too many preview requests. Please wait before trying again.',
			retryAfterSeconds,
			error: 'rate_limit_exceeded',
		});
	},
});

router.post('/sample', ttsPreviewLimiter, sampleSpeech);

module.exports = router;
