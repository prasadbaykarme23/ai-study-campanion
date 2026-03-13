const express = require('express');
const authMiddleware = require('../middleware/auth');
const questionController = require('../controllers/questionController');

const router = express.Router();

router.post('/', authMiddleware, questionController.createQuestion);
router.get('/', authMiddleware, questionController.getQuestions);
router.delete('/:id', authMiddleware, questionController.deleteQuestion);

module.exports = router;
