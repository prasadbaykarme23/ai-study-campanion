const db = require('../config/db');
const { extractTextFromPDF, extractTextFromFile } = require('../utils/pdfParser');
const { generateSummary, generateQuiz, extractKeyTopics } = require('../utils/aiHelper');
const fs = require('fs');
const path = require('path');

const toPublicFileUrl = (filePath) => {
  if (!filePath) {
    return null;
  }

  const normalized = String(filePath).replace(/\\/g, '/');
  const filename = path.basename(normalized);

  if (normalized.startsWith('/uploads/')) {
    return normalized;
  }

  if (normalized.startsWith('uploads/')) {
    return `/${normalized}`;
  }

  return `/uploads/${filename}`;
};

const resolveStoredFilePath = (fileUrl) => {
  if (!fileUrl) {
    return null;
  }

  if (path.isAbsolute(fileUrl)) {
    return fileUrl;
  }

  return path.resolve(__dirname, '..', 'uploads', path.basename(String(fileUrl)));
};

const toStructuredErrorResponse = (error, fallbackMessage = 'AI processing failed') => {
  const status = Number(error?.status) || 500;
  const code = error?.code || 'openai_request_failed';
  const message = error?.message || fallbackMessage;
  return {
    status,
    payload: {
      success: false,
      error: {
        status,
        code,
        message,
        details: error?.details || null,
      },
    },
  };
};

const uploadMaterial = async (req, res) => {
  try {
    const { title, content } = req.body;
    const file = req.file;
    let fileContent = content;
    let fileType = 'text';

    if (file) {
      fileType = file.mimetype === 'application/pdf' ? 'pdf' : 'text';
      const filePath = file.path;

      try {
        if (fileType === 'pdf') {
          fileContent = await extractTextFromPDF(filePath);
        } else {
          fileContent = await extractTextFromFile(filePath);
        }
      } catch (error) {
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'Error parsing file', error: error.message });
      }
    }

    // Generate summary and key topics
    let summary = null;
    let keyTopics = [];

    try {
      summary = await generateSummary(fileContent);
      keyTopics = await extractKeyTopics(fileContent);
    } catch (error) {
      console.error('AI processing error:', error);
      const structured = toStructuredErrorResponse(error, 'Failed to process content with OpenAI');
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(structured.status).json(structured.payload);
    }

    const materialsRef = db.collection('materials');
    const usersRef = db.collection('users');

    const materialData = {
      userId: req.userId,
      title,
      content: fileContent,
      summary,
      fileUrl: file ? toPublicFileUrl(file.path) : null,
      fileType,
      keyTopics,
      createdAt: db.FieldValue.serverTimestamp(),
      updatedAt: db.FieldValue.serverTimestamp(),
    };

    const materialRef = await materialsRef.add(materialData);
    const materialId = materialRef.id;

    // Add to user's study topics
    const userRef = usersRef.doc(req.userId);
    await userRef.update({
      studyTopics: db.FieldValue.arrayUnion(materialId),
    });

    res.status(201).json({
      message: 'Material uploaded successfully',
      material: { 
        id: materialId,
        userId: req.userId,
        title,
        content: fileContent,
        summary,
        fileUrl: file ? toPublicFileUrl(file.path) : null,
        fileType,
        keyTopics,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    const structured = toStructuredErrorResponse(error, 'Error uploading material');
    res.status(structured.status).json(structured.payload);
  }
};

const getMaterials = async (req, res) => {
  try {
    const materialsRef = db.collection('materials');
    
    const materialsSnapshot = await materialsRef.where('userId', '==', req.userId).get();
    
    const materials = [];
    for (const doc of materialsSnapshot.docs) {
      const materialData = { id: doc.id, ...doc.data() };
      materialData.fileUrl = toPublicFileUrl(materialData.fileUrl);
      
      // Get associated quizzes
      const quizzesSnapshot = await db.collection('quizzes').where('materialId', '==', doc.id).get();
      materialData.quizzes = quizzesSnapshot.docs.map(q => ({ id: q.id, ...q.data() }));
      
      materials.push(materialData);
    }
    
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching materials', error: error.message });
  }
};

const getMaterialById = async (req, res) => {
  try {
    const materialDoc = await db.collection('materials').doc(req.params.id).get();
    
    if (!materialDoc.exists) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    const material = { id: materialDoc.id, ...materialDoc.data() };
    material.fileUrl = toPublicFileUrl(material.fileUrl);
    
    if (material.userId !== req.userId) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    // Get associated quizzes
    const quizzesSnapshot = await db.collection('quizzes').where('materialId', '==', req.params.id).get();
    material.quizzes = quizzesSnapshot.docs.map(q => ({ id: q.id, ...q.data() }));
    
    res.json(material);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching material', error: error.message });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const materialDoc = await db.collection('materials').doc(req.params.id).get();
    
    if (!materialDoc.exists) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    const material = materialDoc.data();
    
    if (material.userId !== req.userId) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.fileUrl) {
      const storedFilePath = resolveStoredFilePath(material.fileUrl);
      if (storedFilePath) {
        fs.unlink(storedFilePath, () => {});
      }
    }

    await db.collection('materials').doc(req.params.id).delete();
    
    // Delete associated quizzes
    const quizzesSnapshot = await db.collection('quizzes').where('materialId', '==', req.params.id).get();
    const batch = db.batch();
    quizzesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting material', error: error.message });
  }
};

module.exports = {
  uploadMaterial,
  getMaterials,
  getMaterialById,
  deleteMaterial,
};
