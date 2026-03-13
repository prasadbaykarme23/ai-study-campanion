const db = require('../config/db');
const { generateQuiz, answerQuestion } = require('../utils/aiHelper');
const { generateMockQuiz } = require('../utils/mockQuizGenerator');


const createQuiz = async (req, res) => {
  try {
    console.log('[QUIZ] Received request body:', JSON.stringify(req.body));
    const { materialId, difficulty = 'medium' } = req.body;

    // Validate input
    if (!materialId) {
      console.error('[QUIZ] ❌ Material ID is missing from request body');
      return res.status(400).json({ message: 'Material ID is required' });
    }

    console.log(`[QUIZ] Creating quiz for material: ${materialId}, difficulty: ${difficulty}`);

    const materialDoc = await db.collection('materials').doc(materialId).get();
    
    if (!materialDoc.exists) {
      console.error(`[QUIZ] Material not found: ${materialId}`);
      return res.status(404).json({ message: 'Material not found' });
    }
    
    const material = { id: materialDoc.id, ...materialDoc.data() };
    
    if (material.userId !== req.userId) {
      console.error(`[QUIZ] Unauthorized access - userId mismatch`);
      return res.status(403).json({ message: 'Unauthorized' });
    }

    console.log(`[QUIZ] Material found: ${material.title}, content length: ${material.content.length}`);

    if (!material.content || material.content.trim().length === 0) {
      console.error('[QUIZ] Material content is empty');
      return res.status(400).json({ message: 'Material content is empty' });
    }

    let questions = [];
    try {
      console.log('[QUIZ] Calling generateQuiz with content length:', material.content.length);
      questions = await generateQuiz(material.content, difficulty);
      console.log(`[QUIZ] Successfully generated ${questions.length} questions`);
    } catch (error) {
      console.error('[QUIZ] OpenAI generation failed:', error.message);
      console.log('[QUIZ] Falling back to mock questions with material content...');
      // Use mock questions if OpenAI fails, passing the material content for context
      questions = generateMockQuiz(material.content, difficulty);
      console.log(`[QUIZ] Using ${questions.length} mock questions based on material content`);
    }

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'Failed to generate quiz questions' });
    }

    const quizData = {
      materialId,
      userId: req.userId,
      questions,
      difficulty,
      createdAt: db.FieldValue.serverTimestamp(),
      updatedAt: db.FieldValue.serverTimestamp(),
    };

    const quizRef = await db.collection('quizzes').add(quizData);
    const quizId = quizRef.id;
    
    await db.collection('materials').doc(materialId).update({
      quizzes: db.FieldValue.arrayUnion(quizId),
    });

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: { 
        id: quizId, 
        materialId,
        userId: req.userId,
        questions,
        difficulty,
      },
    });
  } catch (error) {
    console.error('[QUIZ] ❌ Error creating quiz:', error.message, error.stack);
    res.status(500).json({ message: 'Error creating quiz', error: error.message });
  }
};

const getQuiz = async (req, res) => {
  try {
    const quizDoc = await db.collection('quizzes').doc(req.params.id).get();
    
    if (!quizDoc.exists) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    const quiz = { id: quizDoc.id, ...quizDoc.data() };
    
    if (quiz.userId !== req.userId) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quiz', error: error.message });
  }
};

const submitQuizAnswers = async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    const quizDoc = await db.collection('quizzes').doc(quizId).get();
    
    if (!quizDoc.exists) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    const quiz = { id: quizDoc.id, ...quizDoc.data() };
    
    if (quiz.userId !== req.userId) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    let score = 0;
    const results = answers.map((answer, index) => {
      const isCorrect = answer.answer === quiz.questions[index].correctAnswer;
      if (isCorrect) score++;

      return {
        questionId: index,
        userAnswer: answer.answer,
        isCorrect,
      };
    });

    const quizResultData = {
      userId: req.userId,
      quizId,
      score,
      totalQuestions: quiz.questions.length,
      answers: results,
      createdAt: db.FieldValue.serverTimestamp(),
    };

    await db.collection('quizResults').add(quizResultData);

    // Update weak topics
    const materialDoc = await db.collection('materials').doc(quiz.materialId).get();
    const material = materialDoc.data();
    const userDoc = await db.collection('users').doc(req.userId).get();
    const user = userDoc.data();

    const weakTopics = user.weakTopics || {};

    for (let i = 0; i < results.length; i++) {
      if (!results[i].isCorrect) {
        const topic = material.keyTopics?.[i] || `Topic ${i + 1}`;
        weakTopics[topic] = (weakTopics[topic] || 0) + 1;
      }
    }

    await db.collection('users').doc(req.userId).update({
      weakTopics,
      updatedAt: db.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      message: 'Quiz submitted successfully',
      score,
      totalQuestions: quiz.questions.length,
      percentage: ((score / quiz.questions.length) * 100).toFixed(2),
      results: {
        answers: results,
        questions: quiz.questions.map((q, idx) => ({
          ...q,
          isCorrect: results[idx].isCorrect,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting quiz', error: error.message });
  }
};

const getQuizResults = async (req, res) => {
  try {
    const resultsSnapshot = await db.collection('quizResults').where('userId', '==', req.userId).get();
    
    const results = [];
    for (const doc of resultsSnapshot.docs) {
      const resultData = { id: doc.id, ...doc.data() };
      
      // Populate quiz data
      if (resultData.quizId) {
        const quizDoc = await db.collection('quizzes').doc(resultData.quizId).get();
        if (quizDoc.exists) {
          resultData.quizId = { id: quizDoc.id, ...quizDoc.data() };
        }
      }
      
      results.push(resultData);
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};

module.exports = {
  createQuiz,
  getQuiz,
  submitQuizAnswers,
  getQuizResults,
};
