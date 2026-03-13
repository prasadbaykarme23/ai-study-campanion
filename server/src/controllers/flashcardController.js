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

const normalizeFlashcard = (id, data = {}) => ({
  id,
  ...data,
  createdAt: toIsoString(data.createdAt),
  updatedAt: toIsoString(data.updatedAt),
});

const createFlashcard = async (req, res) => {
  try {
    const { front, back } = req.body;
    if (!front || !back) {
      return res.status(400).json({ message: 'Both front and back text are required' });
    }

    const flashcardData = {
      userId: req.userId,
      front: front.trim(),
      back: back.trim(),
      createdAt: db.FieldValue.serverTimestamp(),
      updatedAt: db.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('flashcards').add(flashcardData);
    const createdDoc = await db.collection('flashcards').doc(docRef.id).get();
    const flashcard = normalizeFlashcard(docRef.id, createdDoc.data() || flashcardData);
    res.status(201).json({ message: 'Flashcard created', flashcard });
  } catch (error) {
    res.status(500).json({ message: 'Error creating flashcard', error: error.message });
  }
};

const getFlashcards = async (req, res) => {
  try {
    let snapshot;

    try {
      snapshot = await db
        .collection('flashcards')
        .where('userId', '==', req.userId)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (queryError) {
      const message = String(queryError?.message || '');
      const needsIndex = message.includes('FAILED_PRECONDITION') && message.includes('requires an index');

      if (!needsIndex) {
        throw queryError;
      }

      snapshot = await db
        .collection('flashcards')
        .where('userId', '==', req.userId)
        .get();
    }

    const cards = snapshot.docs
      .map((doc) => normalizeFlashcard(doc.id, doc.data()))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching flashcards', error: error.message });
  }
};

const deleteFlashcard = async (req, res) => {
  try {
    const docRef = db.collection('flashcards').doc(req.params.id);
    const cardDoc = await docRef.get();

    if (!cardDoc.exists || cardDoc.data()?.userId !== req.userId) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    await docRef.delete();
    res.json({ message: 'Flashcard deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting flashcard', error: error.message });
  }
};

module.exports = { createFlashcard, getFlashcards, deleteFlashcard };
