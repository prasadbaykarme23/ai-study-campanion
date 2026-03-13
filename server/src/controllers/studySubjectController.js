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

const normalizeSubject = (id, data = {}) => ({
  id,
  ...data,
  createdAt: toIsoString(data.createdAt),
  updatedAt: toIsoString(data.updatedAt),
});

const listSubjects = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let snapshot;

    try {
      snapshot = await db
        .collection('studySubjects')
        .where('userId', '==', req.userId)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (queryError) {
      const message = String(queryError?.message || '');
      const needsIndex = message.includes('FAILED_PRECONDITION') && message.includes('requires an index');

      if (!needsIndex) {
        throw queryError;
      }

      // Fallback path for environments where the composite index is not deployed yet.
      snapshot = await db
        .collection('studySubjects')
        .where('userId', '==', req.userId)
        .get();
    }

    const subjects = snapshot.docs
      .map((doc) => normalizeSubject(doc.id, doc.data()))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    return res.json({ subjects });
  } catch (error) {
    console.error('[LIST_SUBJECTS_ERROR]', {
      userId: req.userId,
      error: error.message,
    });
    return res.status(500).json({ message: 'Error fetching subjects', error: error.message });
  }
};

const addSubject = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const title = req.body?.title?.trim();

    if (!title) {
      return res.status(400).json({ message: 'Subject title is required' });
    }

    const subjectData = {
      userId: req.userId,
      title,
      createdAt: db.FieldValue.serverTimestamp(),
      updatedAt: db.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('studySubjects').add(subjectData);
    const createdDoc = await db.collection('studySubjects').doc(docRef.id).get();
    const subject = normalizeSubject(docRef.id, createdDoc.data() || subjectData);

    return res.status(201).json({
      message: 'Subject added successfully',
      subject,
    });
  } catch (error) {
    console.error('[ADD_SUBJECT_ERROR]', {
      userId: req.userId,
      error: error.message,
    });
    return res.status(500).json({ message: 'Error adding subject', error: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({ message: 'Invalid subject ID' });
    }

    const docRef = db.collection('studySubjects').doc(id);
    const subjectDoc = await docRef.get();

    if (!subjectDoc.exists || subjectDoc.data()?.userId !== req.userId) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await docRef.delete();

    return res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('[DELETE_SUBJECT_ERROR]', {
      userId: req.userId,
      subjectId: req.params?.id,
      error: error.message,
    });
    return res.status(500).json({ message: 'Error deleting subject', error: error.message });
  }
};

module.exports = {
  listSubjects,
  addSubject,
  deleteSubject,
};
