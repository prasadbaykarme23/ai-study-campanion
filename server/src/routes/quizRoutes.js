const express = require('express');
const authMiddleware = require('../middleware/auth');
const quizController = require('../controllers/quizController');

const router = express.Router();

router.post('/create', authMiddleware, quizController.createQuiz);
router.get('/:id', authMiddleware, quizController.getQuiz);
router.post('/submit', authMiddleware, quizController.submitQuizAnswers);
router.get('/results/all', authMiddleware, quizController.getQuizResults);

module.exports = router;
