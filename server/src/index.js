require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initializeFirebase = require('./config/database');
const fs = require('fs');
const path = require('path');

console.log('[STARTUP] Environment variables loaded');
console.log('[STARTUP] OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
console.log('[STARTUP] OpenAI API Key length:', process.env.OPENAI_API_KEY?.length || 0);
if (process.env.OPENAI_API_KEY) {
  console.log('[STARTUP] API Key preview:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
}

let openai;
try {
  openai = require('./config/openai');
  openai.validateOpenAIConfig();
  console.log('[STARTUP] ✅ OpenAI configuration validated');
} catch (configError) {
  console.error('[STARTUP] ❌ OpenAI configuration error:', configError.message);
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Allow OAuth popups to communicate with opener without COOP blocking window.close/window.closed.
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Optional: Initialize Passport for OAuth if configured
try {
  const { passport, configurePassport } = require('./config/passport');
  app.use(passport.initialize());
  const { isGoogleEnabled, isGithubEnabled } = configurePassport();
  console.log('[STARTUP] OAuth - Google:', isGoogleEnabled ? 'Enabled' : 'Disabled');
  console.log('[STARTUP] OAuth - GitHub:', isGithubEnabled ? 'Enabled' : 'Disabled');
} catch (error) {
  console.log('[STARTUP] OAuth not configured (optional feature)');
}

// Resolve uploads directory from project root (server/uploads)
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Support both direct and API-prefixed upload URLs.
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// Initialize Firestore (may return null if credentials are invalid — db.js handles fallback)
const db = initializeFirebase();
global.db = db;

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/summary', require('./routes/summaryRoutes')); // summary/ file upload
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/flashcards', require('./routes/flashcardRoutes'));
// TTS endpoints (text-to-speech)
app.use('/api/tts', require('./routes/ttsRoutes'));
app.use('/api/quiz', require('./routes/quizRoutes'));
app.use('/api/qa', require('./routes/qaRoutes'));
app.use('/api/compile', require('./routes/compilerRoutes'));
app.use('/api/study-subjects', require('./routes/studySubjectRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR-HANDLER] Error caught:', err.message);
  console.error('[ERROR-HANDLER] Error type:', err.name);
  
  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    console.error('[ERROR-HANDLER] Multer error:', err.code);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB.',
        error: err.message 
      });
    }
    return res.status(400).json({ 
      message: 'File upload error', 
      error: err.message 
    });
  }
  
  // Handle file type errors
  if (err.message === 'Unsupported file type') {
    return res.status(400).json({ 
      message: 'Unsupported file type. Please upload PDF, TXT, or DOCX files.',
      error: err.message 
    });
  }
  
  console.error('[ERROR-HANDLER] Stack trace:', err.stack);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const basePort = Number(process.env.PORT) || 5000;

const startServer = (port, hasRetried = false) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE' && !hasRetried) {
      const nextPort = port + 1;
      console.warn(`[STARTUP] Port ${port} is already in use. Retrying on port ${nextPort}...`);
      startServer(nextPort, true);
      return;
    }

    console.error('[STARTUP] Server failed to start:', error.message);
    process.exit(1);
  });
};

startServer(basePort);
