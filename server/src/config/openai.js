require('dotenv').config();
const OpenAI = require('openai');

const validateOpenAIConfig = () => {
  // Check for Groq API key first (preferred), then fall back to OpenAI text key
  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  const openaiTextKey = (process.env.OPENAI_API_KEY_TEXT || '').trim();
  const openaiVoiceKey = (process.env.OPENAI_API_KEY_VOICE || '').trim();
  const elevenLabsKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  const legacyKey = (process.env.OPENAI_API_KEY || '').trim();
  
  // For text operations: Groq > OPENAI_API_KEY_TEXT > OPENAI_API_KEY (legacy)
  const textApiKey = groqKey || openaiTextKey || legacyKey;
  
  // For voice operations: OPENAI_API_KEY_VOICE > OPENAI_API_KEY (legacy)
  const voiceApiKey = openaiVoiceKey || legacyKey;

  if (!textApiKey) {
    const error = new Error('Text API key missing. Please set GROQ_API_KEY or OPENAI_API_KEY_TEXT in server/.env.');
    error.code = 'TEXT_API_KEY_MISSING';
    throw error;
  }

  if (!voiceApiKey && !elevenLabsKey) {
    const error = new Error('Voice API key missing. Please set OPENAI_API_KEY_VOICE in server/.env.');
    error.code = 'VOICE_API_KEY_MISSING';
    throw error;
  }

  if (groqKey) {
    console.log('[AI-CONFIG] Text operations: Using Groq API (faster inference)');
    if (!groqKey.startsWith('gsk_')) {
      const error = new Error("GROQ_API_KEY format is invalid. Expected key starting with 'gsk_'.");
      error.code = 'GROQ_KEY_INVALID_FORMAT';
      throw error;
    }
  } else if (openaiTextKey) {
    console.log('[AI-CONFIG] Text operations: Using OpenAI API (OPENAI_API_KEY_TEXT)');
    const hasValidPrefix = openaiTextKey.startsWith('sk-') || openaiTextKey.startsWith('sk-proj-');
    if (!hasValidPrefix) {
      const error = new Error("OPENAI_API_KEY_TEXT format is invalid. Expected key starting with 'sk-' or 'sk-proj-'.");
      error.code = 'OPENAI_TEXT_KEY_INVALID_FORMAT';
      throw error;
    }
  }

  if (elevenLabsKey) {
    console.log('[AI-CONFIG] Voice operations: Using ElevenLabs API (ELEVENLABS_API_KEY)');
    if (!elevenLabsKey.startsWith('sk_')) {
      const error = new Error("ELEVENLABS_API_KEY format is invalid. Expected key starting with 'sk_'.");
      error.code = 'ELEVENLABS_KEY_INVALID_FORMAT';
      throw error;
    }
  } else {
    console.log('[AI-CONFIG] Voice operations: Using OpenAI API (OPENAI_API_KEY_VOICE)');
    const hasValidVoicePrefix = voiceApiKey.startsWith('sk-') || voiceApiKey.startsWith('sk-proj-');
    if (!hasValidVoicePrefix) {
      // Check if user accidentally used a Groq key for voice
      if (voiceApiKey.startsWith('gsk_')) {
        const error = new Error("❌ GROQ API KEYS DO NOT SUPPORT TTS! OPENAI_API_KEY_VOICE must be an OpenAI key (starting with 'sk-' or 'sk-proj-'), not a Groq key.");
        error.code = 'GROQ_KEY_NOT_SUPPORTED_FOR_TTS';
        throw error;
      }
      const error = new Error("OPENAI_API_KEY_VOICE format is invalid. Expected key starting with 'sk-' or 'sk-proj-'.");
      error.code = 'OPENAI_VOICE_KEY_INVALID_FORMAT';
      throw error;
    }
  }

  return true;
};

// Initialize keys
const groqKey = (process.env.GROQ_API_KEY || '').trim();
const openaiTextKey = (process.env.OPENAI_API_KEY_TEXT || '').trim();
const openaiVoiceKey = (process.env.OPENAI_API_KEY_VOICE || '').trim();
const elevenLabsKey = (process.env.ELEVENLABS_API_KEY || '').trim();
const legacyKey = (process.env.OPENAI_API_KEY || '').trim();

const textApiKey = groqKey || openaiTextKey || legacyKey;
const voiceApiKey = openaiVoiceKey || legacyKey;

// Text Client: For summaries, Q&A, text generation (using Groq or OpenAI)
const textClient = new OpenAI({
  apiKey: textApiKey,
  baseURL: groqKey ? 'https://api.groq.com/openai/v1' : undefined,
});

// Voice Client: For OpenAI TTS fallback when ElevenLabs is not configured.
const voiceClient = voiceApiKey
  ? new OpenAI({
      apiKey: voiceApiKey,
      // No baseURL override - always use OpenAI's default endpoint for TTS
    })
  : null;

console.log('[AI-CONFIG] ✅ AI clients initialized');
console.log('[AI-CONFIG] Text Provider:', groqKey ? 'Groq' : 'OpenAI');
console.log('[AI-CONFIG] Text API Key length:', textApiKey.length, 'chars');
console.log('[AI-CONFIG] Voice Provider:', elevenLabsKey ? 'ElevenLabs' : 'OpenAI');
console.log('[AI-CONFIG] Voice API Key length:', (elevenLabsKey || voiceApiKey).length, 'chars');
console.log('[AI-CONFIG] Using separate keys:', textApiKey !== (elevenLabsKey || voiceApiKey) ? 'YES ✅' : 'NO (same key)');

// Export both clients and legacy default (for backward compatibility)
const openai = textClient; // Default export uses text client
openai.validateOpenAIConfig = validateOpenAIConfig;
openai.textClient = textClient;
openai.voiceClient = voiceClient;

module.exports = openai;
