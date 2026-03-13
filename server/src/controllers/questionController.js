const db = require('../config/db');

const toIsoString = (value) => {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (typeof value === 'object' && Number.isFinite(value._seconds)) {
    return new Date(value._seconds * 1000).toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeQuestion = (id, data = {}) => ({
  id,
  ...data,
  createdAt: toIsoString(data.createdAt),
  updatedAt: toIsoString(data.updatedAt),
});

const createQuestion = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Question text is required' });
    }

    const questionData = {
      userId: req.userId,
      text: text.trim(),
      createdAt: db.FieldValue.serverTimestamp(),
      updatedAt: db.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('questions').add(questionData);
    const createdDoc = await db.collection('questions').doc(docRef.id).get();
    const question = normalizeQuestion(docRef.id, createdDoc.data() || questionData);
    res.status(201).json({ message: 'Question saved', question });
  } catch (error) {
    res.status(500).json({ message: 'Error saving question', error: error.message });
  }
};

const getQuestions = async (req, res) => {
  try {
    let snapshot;

    try {
      snapshot = await db
        .collection('questions')
        .where('userId', '==', req.userId)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (queryError) {
      const message = String(queryError?.message || '');
      const needsIndex = message.includes('FAILED_PRECONDITION') && message.includes('requires an index');

      if (!needsIndex) {
        throw queryError;
      }

      // Fallback path for projects that do not yet have the composite index.
      snapshot = await db
        .collection('questions')
        .where('userId', '==', req.userId)
        .get();
    }

    const questions = snapshot.docs
      .map((doc) => normalizeQuestion(doc.id, doc.data()))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching questions', error: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const docRef = db.collection('questions').doc(req.params.id);
    const questionDoc = await docRef.get();

    if (!questionDoc.exists || questionDoc.data()?.userId !== req.userId) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await docRef.delete();
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting question', error: error.message });
  }
};

module.exports = { createQuestion, getQuestions, deleteQuestion };