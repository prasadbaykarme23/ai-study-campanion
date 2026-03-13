const fs = require('fs');
const path = require('path');
const { generateSpeechBuffer } = require('../utils/ttsProvider');

const TTS_QUOTA_COOLDOWN_MS = 2 * 60 * 1000;
let ttsQuotaBlockedUntil = 0;

const isQuotaError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const nestedMessage = String(error?.error?.message || '').toLowerCase();
  return (
    error?.status === 429 ||
    error?.code === 'insufficient_quota' ||
    message.includes('insufficient_quota') ||
    nestedMessage.includes('insufficient_quota') ||
    message.includes('quota') ||
    nestedMessage.includes('quota')
  );
};

const buildErrorPayload = (status, code, message, details = null) => ({
  success: false,
  error: {
    status,
    code,
    message,
    details,
  },
});

const sampleSpeech = async (req, res) => {
  console.log('[TTS-PREVIEW] === Starting TTS preview generation ===');
  
  try {
    const { voice = 'alloy', text = `This is a preview of the ${voice} voice.` } = req.body || {};
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    
    console.log('[TTS-PREVIEW] Voice requested:', voice);
    console.log('[TTS-PREVIEW] Text length:', text.length);

    if (!process.env.ELEVENLABS_API_KEY && !process.env.OPENAI_API_KEY_VOICE && !process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        message: 'Server configuration error: voice API key is required for TTS features.',
        error: 'No TTS provider configured',
        hint: 'Set ELEVENLABS_API_KEY (preferred) or OPENAI_API_KEY_VOICE in server/.env.'
      });
    }

    if (!validVoices.includes(voice)) {
      return res.status(400).json({
        message: 'Invalid voice selected for preview.',
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: 'Preview text cannot be empty.',
      });
    }

    if (Date.now() < ttsQuotaBlockedUntil) {
      const retryAfterSeconds = Math.max(1, Math.ceil((ttsQuotaBlockedUntil - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json(
        buildErrorPayload(
          429,
          'insufficient_quota',
          'Voice provider rate limit exceeded. Please wait before trying again.',
          { retryAfterSeconds }
        )
      );
    }

    const provider = process.env.ELEVENLABS_API_KEY ? 'ElevenLabs' : 'OpenAI';
    console.log(`[TTS-PREVIEW] Calling ${provider} TTS API...`);
    const buffer = await generateSpeechBuffer(text, voice);
    console.log('[TTS-PREVIEW] ✅ Audio generated, buffer size:', buffer.length, 'bytes');

    // Save to uploads
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    const filename = `tts-${voice}-${Date.now()}.mp3`;
    const filepath = path.join('uploads', filename);
    fs.writeFileSync(filepath, buffer);
    console.log('[TTS-PREVIEW] ✅ Audio saved:', filename);

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    console.log('[TTS-PREVIEW] === TTS preview complete ===');
    
    res.json({ audioUrl: fileUrl });
  } catch (error) {
    console.error('[TTS-PREVIEW] ❌ Error:', error?.message || error);
    console.error('[TTS-PREVIEW] Error type:', error?.name);
    console.error('[TTS-PREVIEW] Error status:', error?.status);
    console.error('[TTS-PREVIEW] Error code:', error?.code);
    console.error('[TTS-PREVIEW] Error details:', error?.error?.message || error?.response?.data || 'none');

    if (error?.status === 401) {
      return res
        .status(401)
        .json(
          buildErrorPayload(
            401,
            'invalid_api_key',
            'Invalid voice API key. Please verify your environment configuration.',
            { providerMessage: error?.message || String(error) }
          )
        );
    }

    if (error?.status === 403) {
      return res
        .status(403)
        .json(
          buildErrorPayload(
            403,
            'provider_access_denied',
            'Voice provider access denied. Check billing and permissions.',
            { providerMessage: error?.message || String(error) }
          )
        );
    }

    if (error?.status === 400) {
      return res
        .status(400)
        .json(
          buildErrorPayload(
            400,
            'tts_bad_request',
            'Invalid TTS request sent to provider. Please try a different voice or shorter text.',
            { providerMessage: error?.message || String(error) }
          )
        );
    }

    // Handle unavailable voice/model errors
    if (error?.status === 404 || error?.code === 'model_not_found') {
      return res
        .status(404)
        .json(
          buildErrorPayload(
            404,
            'model_not_found',
            'TTS voice/model unavailable. Please check provider settings.',
            { providerMessage: error?.message || String(error) }
          )
        );
    }
    
    // OpenAI quota/429 should be propagated so client can show an informative alert
    if (isQuotaError(error)) {
      console.error('[TTS-PREVIEW] Rate limit or quota exceeded');
      const providerRetryAfterSeconds = Number(error?.details?.retryAfterSeconds) || 0;
      const cooldownSeconds = providerRetryAfterSeconds > 0 ? Math.max(5, providerRetryAfterSeconds) : Math.ceil(TTS_QUOTA_COOLDOWN_MS / 1000);
      ttsQuotaBlockedUntil = Date.now() + cooldownSeconds * 1000;
      res.set('Retry-After', String(cooldownSeconds));
      return res
        .status(429)
        .json(
          buildErrorPayload(
            429,
            'insufficient_quota',
            'Voice provider rate limit exceeded. Please wait before trying again.',
            {
              providerMessage: error?.message || String(error),
              retryAfterSeconds: cooldownSeconds,
            }
          )
        );
    }
    
    res
      .status(500)
      .json(
        buildErrorPayload(500, 'tts_generation_failed', 'TTS generation failed', {
          providerMessage: error?.message || String(error),
        })
      );
  }
};

module.exports = { sampleSpeech };
