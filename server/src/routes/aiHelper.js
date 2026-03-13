const openaiConfig = require('../config/openai');
const { generateSpeechBuffer } = require('../utils/ttsProvider');

const generateSpeech = async (text, voice = 'alloy') => {
  return generateSpeechBuffer(text, voice);
};

module.exports = { generateSpeech };