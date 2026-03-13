const express = require('express');
const authMiddleware = require('../middleware/auth');
const flashcardController = require('../controllers/flashcardController');

const router = express.Router();

router.post('/', authMiddleware, flashcardController.createFlashcard);
router.get('/', authMiddleware, flashcardController.getFlashcards);
router.delete('/:id', authMiddleware, flashcardController.deleteFlashcard);

module.exports = router;