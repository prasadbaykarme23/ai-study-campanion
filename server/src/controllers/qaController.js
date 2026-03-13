const { answerQuestion } = require('../utils/aiHelper');
const { generateMockAnswer } = require('../utils/mockQuizGenerator');
const db = require('../config/db');

const askQuestion = async (req, res) => {
  try {
    console.log('[QA] Received request body:', JSON.stringify(req.body));
    const { materialId, question, mode = 'material' } = req.body;
    const normalizedMode = ['material', 'general', 'focus'].includes(mode) ? mode : 'material';

    if (normalizedMode === 'material' && !materialId) {
      console.error('[QA] ❌ Material ID is missing from request body');
      return res.status(400).json({ message: 'Material ID is required' });
    }

    if (!question) {
      console.error('[QA] ❌ Question is missing from request body');
      return res.status(400).json({ message: 'Question is required' });
    }

    let material = null;
    if (materialId) {
      console.log('[QA] Looking up material:', materialId);
      const materialDoc = await db.collection('materials').doc(materialId).get();

      if (!materialDoc.exists) {
        console.error('[QA] ❌ Material not found:', materialId);
        return res.status(404).json({ message: 'Material not found' });
      }

      material = { id: materialDoc.id, ...materialDoc.data() };

      if (material.userId !== req.userId) {
        console.error('[QA] ❌ Unauthorized - userId mismatch');
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    console.log('[QA] Material found, calling answerQuestion...');
    let answer;
    try {
      answer = await answerQuestion(material?.content || '', question, { mode: normalizedMode });
      console.log('[QA] ✅ Answer generated successfully');
    } catch (error) {
      console.error('[QA] OpenAI generation failed:', error.message);
      console.log('[QA] Falling back to mock answer with material content...');
      // Use mock answer if OpenAI fails, passing the material content for context
      answer = generateMockAnswer(question, material?.content || '', { mode: normalizedMode });
      console.log('[QA] Using mock answer based on material content as fallback');
    }

    res.json({
      question,
      answer,
      material: material
        ? {
            id: material.id,
            title: material.title,
          }
        : null,
    });
  } catch (error) {
    console.error('[QA] ❌ Unexpected error:', error.message);
    res.status(500).json({ message: 'Error answering question', error: error.message });
  }
};

module.exports = {
  askQuestion,
};
