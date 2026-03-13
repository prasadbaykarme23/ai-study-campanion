const express = require('express');
const authMiddleware = require('../middleware/auth');
const { listSubjects, addSubject, deleteSubject } = require('../controllers/studySubjectController');

const router = express.Router();

router.get('/', authMiddleware, listSubjects);
router.post('/', authMiddleware, addSubject);
router.delete('/:id', authMiddleware, deleteSubject);

module.exports = router;
