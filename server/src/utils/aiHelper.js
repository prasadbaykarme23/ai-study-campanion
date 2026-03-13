const openai = require('../config/openai');
const { generateSpeechBuffer } = require('./ttsProvider');

const QUOTA_COOLDOWN_MS = 5 * 60 * 1000;
let quotaBlockedUntil = 0;

const createOpenAIError = ({ status, code, message, details }) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
};

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

const ensureQuotaNotBlocked = () => {
  if (Date.now() < quotaBlockedUntil) {
    const retryAfterSeconds = Math.max(1, Math.ceil((quotaBlockedUntil - Date.now()) / 1000));
    throw createOpenAIError({
      status: 429,
      code: 'insufficient_quota',
      message: 'OpenAI quota exceeded. Please check billing or upgrade your plan.',
      details: {
        retryAfterSeconds,
      },
    });
  }
};

const mapOpenAIError = (error) => {
  if (error?.status === 401) {
    return createOpenAIError({
      status: 401,
      code: 'invalid_api_key',
      message: 'Invalid OpenAI API key. Please verify your environment configuration.',
      details: { providerMessage: error?.message || null },
    });
  }

  if (isQuotaError(error)) {
    quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
    return createOpenAIError({
      status: 429,
      code: 'insufficient_quota',
      message: 'OpenAI quota exceeded. Please check billing or upgrade your plan.',
      details: {
        providerMessage: error?.message || null,
        retryAfterSeconds: Math.ceil(QUOTA_COOLDOWN_MS / 1000),
      },
    });
  }

  if (error?.status === 403) {
    return createOpenAIError({
      status: 403,
      code: 'openai_access_denied',
      message: 'OpenAI access denied. Check billing and organization permissions.',
      details: { providerMessage: error?.message || null },
    });
  }

  if (error?.status === 400) {
    return createOpenAIError({
      status: 400,
      code: 'openai_bad_request',
      message: 'Invalid request sent to OpenAI. Please adjust input and try again.',
      details: { providerMessage: error?.message || null },
    });
  }

  return createOpenAIError({
    status: 500,
    code: 'openai_request_failed',
    message: 'OpenAI request failed. Please try again later.',
    details: { providerMessage: error?.message || null },
  });
};

const generateSummary = async (content) => {
  console.log('[SUMMARY-AI] Starting summary generation...');
  console.log('[SUMMARY-AI] Content length:', content?.length || 0, 'characters');
  
  if (!content || content.trim().length === 0) {
    throw new Error('Content is empty. Cannot generate summary.');
  }
  
  // Limit content to avoid token limits (roughly 3000 tokens = 12000 chars)
  const limitedContent = content.substring(0, 12000);
  if (content.length > 12000) {
    console.log('[SUMMARY-AI] Content truncated from', content.length, 'to 12000 chars');
  }
  
  try {
    ensureQuotaNotBlocked();
    console.log('[SUMMARY-AI] Calling AI API...');
    
    // Use Groq model if GROQ_API_KEY is set, otherwise use OpenAI model
    const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo';
    console.log('[SUMMARY-AI] Using model:', model);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful AI assistant that creates concise summaries of study material. Keep summaries to 200-300 words.',
        },
        {
          role: 'user',
          content: `Please summarize the following content:\n\n${limitedContent}`,
        },
      ],
      max_tokens: 500,
    });

    console.log('[SUMMARY-AI] ✅ Summary generated successfully');
    return response.choices[0].message.content;
  } catch (error) {
    console.error('[SUMMARY-AI] ❌ AI API Error:');
    console.error('[SUMMARY-AI] Error type:', error?.constructor?.name);
    console.error('[SUMMARY-AI] Error message:', error?.message);
    console.error('[SUMMARY-AI] Error code:', error?.code);
    console.error('[SUMMARY-AI] Error status:', error?.status);

    throw mapOpenAIError(error);
  }
};

const generateQuiz = async (content, difficulty = 'medium') => {
  try {
    console.log('[OPENAI] Starting quiz generation, content length:', content.length);
    
    if (!content || content.trim().length < 50) {
      throw new Error('Content too short for quiz generation');
    }

    // Limit content to avoid token limits
    const limitedContent = content.substring(0, 3000);
    console.log('[OPENAI] Limited content to 3000 chars, actual length:', limitedContent.length);

    console.log('[OPENAI] API Key exists:', !!process.env.OPENAI_API_KEY);
    console.log('[OPENAI] API Key length:', process.env.OPENAI_API_KEY?.length);

    const difficultyInstructions = (() => {
      switch (difficulty) {
        case 'simple':
          return 'Generate basic understanding-level MCQs testing definitions and fundamental concepts only. Keep questions short and direct with no deep analysis.';
        case 'medium':
          return 'Generate conceptual and application-based MCQs that test understanding and reasoning. Include why/how or real-world application prompts.';
        case 'hard':
          return 'Generate advanced analytical and scenario-based MCQs requiring deep conceptual understanding. Avoid simple definitions; focus on multi-step reasoning and problem-solving.';
        default:
          return 'Generate conceptual MCQs of moderate difficulty.';
      }
    })();

    ensureQuotaNotBlocked();
    
    // Use Groq model if GROQ_API_KEY is set, otherwise use OpenAI model
    const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo';
    console.log('[OPENAI] Using model:', model);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are an expert quiz creator. ${difficultyInstructions} Generate up to 5 multiple-choice questions based strictly on the provided content. Each question must be unique and cover a different concept; do not repeat or rephrase the same idea. Provide exactly 4 options per question, with only 1 correct answer. Include a brief explanation for each correct answer. If fewer than 5 distinct questions can be created, return only the valid ones. Difficulty level: ${difficulty}. IMPORTANT: Return ONLY a valid JSON array, nothing else. Format: [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "explanation": "..."}]`,
        },
        {
          role: 'user',
          content: `Create exactly 5 quiz questions from this content:\n\n${limitedContent}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    console.log('[OPENAI] Response received from OpenAI');
    const quizText = response.choices[0].message.content.trim();
    console.log('[OPENAI] Response preview (first 200 chars):', quizText.substring(0, 200));
    
    // Try to extract JSON array
    const jsonMatch = quizText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[OPENAI] No JSON found in response');
      console.error('[OPENAI] Full response:', quizText);
      throw new Error('Invalid quiz format - no JSON array found');
    }

    console.log('[OPENAI] JSON extracted, length:', jsonMatch[0].length);
    const questions = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid quiz format - not an array or empty');
    }

    console.log('[OPENAI] Quiz parsing successful, questions count:', questions.length);
    return questions;
  } catch (error) {
    console.error('[OPENAI] Error details:');
    console.error('  Message:', error.message);
    console.error('  Status:', error.status);
    console.error('  Code:', error.code);
    console.error('  Type:', error.type);
    throw mapOpenAIError(error);
  }
};

const extractKeyTopics = async (content) => {
  try {
    ensureQuotaNotBlocked();
    
    // Use Groq model if GROQ_API_KEY is set, otherwise use OpenAI model
    const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo';
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content:
            'Extract 5-10 key topics or concepts from the provided content. Return as a JSON array of strings.',
        },
        {
          role: 'user',
          content: `Extract key topics from:\n\n${content}`,
        },
      ],
      max_tokens: 200,
    });

    const topicsText = response.choices[0].message.content;
    const jsonMatch = topicsText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    throw mapOpenAIError(error);
  }
};

const buildTutorSystemPrompt = ({ mode = 'material' } = {}) => {
  const sharedRules = [
    'You are AI Study Companion Tutor.',
    'Explain concepts in simple student-friendly language.',
    'Keep explanations clear and structured.',
    'Provide key points to help memory.',
    'Provide a simple real-world example when possible.',
    'Always provide a valid YouTube search link for the topic.',
    'Always return the YouTube link as clickable markdown in this exact style: [Search on YouTube](https://www.youtube.com/results?search_query=<url-encoded-topic>).',
  ];

  if (mode === 'focus') {
    return `${sharedRules.join(' ')} You are a study assistant used inside Focus Mode. Return the answer in clean readable text format with proper line breaks so it displays correctly in a study interface. Do not return JSON. Keep explanation short. Use \\n for new lines and use bullet points with -. Return in this exact format:\nExplanation: <brief explanation>\nKey Points:\n- <point 1>\n- <point 2>\n- <point 3>\nExample: <short real-world example>\nYouTube Search: [Search on YouTube](https://www.youtube.com/results?search_query=<url-encoded-topic>)`;
  }

  if (mode === 'general') {
    return `${sharedRules.join(' ')} This is a general study question. Return in this exact format:\nExplanation: <clear explanation>\nKey Points:\n- <point 1>\n- <point 2>\n- <point 3>\nExample: <simple real-world example>\nYouTube Link: [Search on YouTube](https://www.youtube.com/results?search_query=<url-encoded-topic>)`;
  }

  return `${sharedRules.join(' ')} This question is related to uploaded material. First prioritize the material context. If the answer is not fully present in context, provide a general explanation and clearly state it. Return in this exact format:\nExplanation: <explanation based on material>\nKey Points:\n- <point 1>\n- <point 2>\n- <point 3>\nExample: <simple example>\nYouTube Link: [Search on YouTube](https://www.youtube.com/results?search_query=<url-encoded-topic>)`;
};

const buildYouTubeSearchUrl = (topic) => {
  const safeTopic = String(topic || 'study topic').trim() || 'study topic';
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(safeTopic)}`;
};

const ensureYouTubeMarkdownLink = (answerText, topic) => {
  const normalized = String(answerText || '').trim();
  const fallbackLink = buildYouTubeSearchUrl(topic);

  const markdownYoutubeLinkRegex = /\[[^\]]+\]\(https?:\/\/(?:www\.)?youtube\.com\/results\?search_query=[^)]+\)/i;
  if (markdownYoutubeLinkRegex.test(normalized)) {
    return normalized;
  }

  const plainYoutubeLinkRegex = /https?:\/\/(?:www\.)?youtube\.com\/results\?search_query=\S+/i;
  const plainMatch = normalized.match(plainYoutubeLinkRegex);
  if (plainMatch) {
    return normalized.replace(plainMatch[0], `[Search on YouTube](${plainMatch[0]})`);
  }

  const line = `YouTube Link: [Search on YouTube](${fallbackLink})`;
  return normalized ? `${normalized}\n${line}` : line;
};

const normalizeFocusAnswer = (answerText, topic) => {
  const raw = String(answerText || '').replace(/\r\n/g, '\n').trim();
  const fallbackLink = buildYouTubeSearchUrl(topic);

  const explanationMatch = raw.match(/(?:^|\n)\s*(?:Short\s+)?Explanation\s*:\s*(.+)/i);
  const exampleMatch = raw.match(/(?:^|\n)\s*Example\s*:\s*(.+)/i);

  const bulletMatches = raw.match(/(?:^|\n)\s*[-*]\s+(.+)/g) || [];
  const bulletPoints = bulletMatches
    .map((line) => line.replace(/^[\s\n]*[-*]\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (bulletPoints.length < 3) {
    const sentencePool = raw
      .replace(/(?:^|\n)\s*(?:Short\s+)?Explanation\s*:\s*/gi, '')
      .replace(/(?:^|\n)\s*Example\s*:\s*/gi, '')
      .split(/\.|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 14 && !/^https?:\/\//i.test(s));

    for (const candidate of sentencePool) {
      if (bulletPoints.length >= 3) {
        break;
      }
      const exists = bulletPoints.some((p) => p.toLowerCase() === candidate.toLowerCase());
      if (!exists) {
        bulletPoints.push(candidate);
      }
    }
  }

  while (bulletPoints.length < 3) {
    bulletPoints.push('Review the core concept and connect it to your study goal.');
  }

  const explanation = explanationMatch?.[1]?.trim() || 'This topic can be understood quickly by focusing on its main idea and practical use.';
  const example = exampleMatch?.[1]?.trim() || 'Use this concept in a simple daily scenario to remember it better.';

  const markdownYoutubeLinkRegex = /\[[^\]]+\]\((https?:\/\/(?:www\.)?youtube\.com\/results\?search_query=[^)]+)\)/i;
  const directYoutubeLinkRegex = /(https?:\/\/(?:www\.)?youtube\.com\/results\?search_query=\S+)/i;

  const markdownMatch = raw.match(markdownYoutubeLinkRegex);
  const directMatch = raw.match(directYoutubeLinkRegex);
  const youtubeUrl = markdownMatch?.[1] || directMatch?.[1] || fallbackLink;

  return [
    `Explanation: ${explanation}`,
    'Key Points:',
    `- ${bulletPoints[0]}`,
    `- ${bulletPoints[1]}`,
    `- ${bulletPoints[2]}`,
    `Example: ${example}`,
    `YouTube Search: [Search on YouTube](${youtubeUrl})`,
  ].join('\n');
};

const answerQuestion = async (context, question, options = {}) => {
  try {
    console.log('[QA] Starting answer generation for question:', question.substring(0, 50) + '...');
    ensureQuotaNotBlocked();

    const mode = options?.mode || 'material';
    
    // Use Groq model if GROQ_API_KEY is set, otherwise use OpenAI model
    const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo';
    console.log('[QA] Using model:', model);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: buildTutorSystemPrompt({ mode }),
        },
        {
          role: 'user',
          content:
            mode === 'general'
              ? `Student Question: ${question}`
              : `Material Context:\n${String(context || '').substring(0, 2500)}\n\nStudent Question: ${question}`,
        },
      ],
      max_tokens: 500,
    });

    console.log('[QA] ✅ Answer generated successfully');
    const rawAnswer = response.choices[0].message.content;
    if (mode === 'focus') {
      return normalizeFocusAnswer(rawAnswer, question);
    }
    return ensureYouTubeMarkdownLink(rawAnswer, question);
  } catch (error) {
    console.error('[QA] Error details:');
    console.error('  Message:', error.message);
    console.error('  Status:', error.status);
    console.error('  Code:', error.code);
    console.error('  Type:', error.type);
    throw mapOpenAIError(error);
  }
};

// Text-to-Speech function (uses OpenAI only, not Groq)
const generateSpeech = async (text, voice = 'alloy') => {
  try {
    return await generateSpeechBuffer(text, voice);
  } catch (error) {
    throw mapOpenAIError(error);
  }
};

module.exports = {
  generateSummary,
  generateQuiz,
  extractKeyTopics,
  answerQuestion,
  generateSpeech,
};
