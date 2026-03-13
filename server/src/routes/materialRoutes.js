const express = require('express');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const materialController = require('../controllers/materialController');

const router = express.Router();

router.post('/upload', authMiddleware, upload.single('file'), materialController.uploadMaterial);
router.get('/', authMiddleware, materialController.getMaterials);
router.get('/:id', authMiddleware, materialController.getMaterialById);
router.delete('/:id', authMiddleware, materialController.deleteMaterial);

module.exports = router;
