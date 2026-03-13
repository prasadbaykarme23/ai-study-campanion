const axios = require('axios');
const openaiConfig = require('../config/openai');

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_ELEVEN_MODEL = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const DEFAULT_ELEVEN_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVENLABS_MAX_RETRIES = 1;

const VOICE_MAP = {
  alloy: process.env.ELEVENLABS_VOICE_ALLOY || DEFAULT_ELEVEN_VOICE_ID,
  echo: process.env.ELEVENLABS_VOICE_ECHO || DEFAULT_ELEVEN_VOICE_ID,
  fable: process.env.ELEVENLABS_VOICE_FABLE || DEFAULT_ELEVEN_VOICE_ID,
  onyx: process.env.ELEVENLABS_VOICE_ONYX || DEFAULT_ELEVEN_VOICE_ID,
  nova: process.env.ELEVENLABS_VOICE_NOVA || DEFAULT_ELEVEN_VOICE_ID,
  shimmer: process.env.ELEVENLABS_VOICE_SHIMMER || DEFAULT_ELEVEN_VOICE_ID,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryAfterSeconds = (retryAfterValue) => {
  if (!retryAfterValue) {
    return 0;
  }

  const numeric = Number(retryAfterValue);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.ceil(numeric);
  }

  const retryDate = Date.parse(String(retryAfterValue));
  if (!Number.isNaN(retryDate)) {
    return Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
  }

  return 0;
};

const isQuotaError = (error) => {
  const status = error?.status || error?.response?.status;
  const message = String(error?.message || '').toLowerCase();
  const providerMessage = String(error?.response?.data?.detail || '').toLowerCase();
  return status === 429 || message.includes('quota') || providerMessage.includes('quota');
};

const mapProviderError = (provider, error) => {
  const status = error?.status || error?.response?.status || 500;
  const retryAfterSeconds = parseRetryAfterSeconds(error?.response?.headers?.['retry-after']);
  const providerMessage =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    `${provider} request failed`;

  if (status === 401) {
    const err = new Error(`Invalid ${provider} API key.`);
    err.status = 401;
    err.code = 'invalid_api_key';
    err.details = { provider, providerMessage };
    return err;
  }

  if (status === 403) {
    const err = new Error(`${provider} access denied.`);
    err.status = 403;
    err.code = 'provider_access_denied';
    err.details = { provider, providerMessage };
    return err;
  }

  if (isQuotaError(error)) {
    const err = new Error(`${provider} quota exceeded.`);
    err.status = 429;
    err.code = 'insufficient_quota';
    err.details = { provider, providerMessage, retryAfterSeconds };
    return err;
  }

  if (status === 400) {
    const err = new Error(`Invalid ${provider} TTS request.`);
    err.status = 400;
    err.code = 'tts_bad_request';
    err.details = { provider, providerMessage };
    return err;
  }

  const err = new Error(`${provider} TTS request failed.`);
  err.status = status;
  err.code = 'tts_request_failed';
  err.details = { provider, providerMessage };
  return err;
};

const generateWithElevenLabs = async (text, voice) => {
  const elevenLabsApiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!elevenLabsApiKey) {
    return null;
  }

  const voiceId = VOICE_MAP[voice] || DEFAULT_ELEVEN_VOICE_ID;

  let attempt = 0;
  while (attempt <= ELEVENLABS_MAX_RETRIES) {
    try {
      const response = await axios.post(
        `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: DEFAULT_ELEVEN_MODEL,
        },
        {
          responseType: 'arraybuffer',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          timeout: 15000,
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      const status = error?.response?.status;
      const retryAfterSeconds = parseRetryAfterSeconds(error?.response?.headers?.['retry-after']);

      if (status === 429 && attempt < ELEVENLABS_MAX_RETRIES) {
        const backoffSeconds = retryAfterSeconds > 0 ? retryAfterSeconds : 2;
        console.warn(
          `[TTS] ElevenLabs rate limit hit. Retrying in ${backoffSeconds}s (attempt ${attempt + 1}/${ELEVENLABS_MAX_RETRIES}).`
        );
        await sleep(backoffSeconds * 1000);
        attempt += 1;
        continue;
      }

      throw mapProviderError('ElevenLabs', error);
    }
  }
};

const generateWithOpenAI = async (text, voice) => {
  const ttsClient = openaiConfig.voiceClient;
  if (!ttsClient) {
    return null;
  }

  try {
    const mp3 = await ttsClient.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
    });

    return Buffer.from(await mp3.arrayBuffer());
  } catch (primaryError) {
    if (primaryError?.status === 404 || primaryError?.code === 'model_not_found') {
      const fallback = await ttsClient.audio.speech.create({
        model: 'tts-1',
        voice,
        input: text,
      });
      return Buffer.from(await fallback.arrayBuffer());
    }
    throw mapProviderError('OpenAI', primaryError);
  }
};

const generateSpeechBuffer = async (text, voice = 'alloy') => {
  const elevenLabsApiKey = (process.env.ELEVENLABS_API_KEY || '').trim();

  if (elevenLabsApiKey) {
    try {
      return await generateWithElevenLabs(text, voice);
    } catch (elevenError) {
      // Fall back to OpenAI if ElevenLabs is configured but fails at runtime.
      const openAiBuffer = await generateWithOpenAI(text, voice);
      if (openAiBuffer) {
        return openAiBuffer;
      }
      throw elevenError;
    }
  }

  const openAiBuffer = await generateWithOpenAI(text, voice);
  if (openAiBuffer) {
    return openAiBuffer;
  }

  const err = new Error('No TTS provider configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY_VOICE.');
  err.status = 500;
  err.code = 'tts_provider_missing';
  throw err;
};

module.exports = {
  generateSpeechBuffer,
};
