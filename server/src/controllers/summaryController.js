const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { extractText } = require('../utils/pdfParser');
const { generateSummary } = require('../utils/aiHelper');

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const processFile = async (req, res) => {
  console.log('[SUMMARY-UPLOAD] === Starting file processing ===');
  console.log('[SUMMARY-UPLOAD] User authenticated:', !!req.userId);
  console.log('[SUMMARY-UPLOAD] File received:', !!req.file);
  
  try {
    if (!req.file) {
      console.log('[SUMMARY-UPLOAD] ❌ No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('[SUMMARY-UPLOAD] File details:', {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Extract text
    console.log('[SUMMARY-UPLOAD] Step 1: Extracting text from file...');
    let text;
    try {
      text = await extractText(filePath, mimeType);
      console.log('[SUMMARY-UPLOAD] ✅ Text extracted, length:', text?.length || 0);
      
      if (!text || text.trim().length === 0) {
        console.log('[SUMMARY-UPLOAD] ❌ Extracted text is empty');
        return res.status(400).json({ message: 'Could not extract text from file. File may be empty or corrupted.' });
      }
    } catch (extractError) {
      console.error('[SUMMARY-UPLOAD] ❌ Text extraction failed:', extractError.message);
      return res.status(500).json({ 
        message: 'Failed to extract text from file', 
        error: extractError.message 
      });
    }

    // Generate summary
    console.log('[SUMMARY-UPLOAD] Step 2: Generating AI summary...');
    let summary;
    try {
      summary = await generateSummary(text);
      console.log('[SUMMARY-UPLOAD] ✅ Summary generated, length:', summary?.length || 0);
    } catch (summaryError) {
      console.error('[SUMMARY-UPLOAD] ❌ Summary generation failed:', summaryError.message);

      const status = Number(summaryError?.status) || 500;
      return res.status(status).json({
        success: false,
        error: {
          status,
          code: summaryError?.code || 'summary_generation_failed',
          message:
            summaryError.message ||
            'Failed to generate summary. Please check OpenAI API configuration.',
          details: summaryError?.details || null,
        },
      });
    }

    // Build public file URL for uploaded document
    const fileUrl = `/uploads/${path.basename(filePath)}`;
    console.log('[SUMMARY-UPLOAD] File URL:', fileUrl);

    // Generate audio (TTS) for the summary and save to uploads
    console.log('[SUMMARY-UPLOAD] Step 3: Generating TTS audio (optional)...');
    let audioPublicUrl = null;
    try {
      // TTS requires OpenAI API (Groq doesn't support audio.speech)
      // Use the dedicated voice client from config
      const openaiConfig = require('../config/openai');
      const ttsClient = openaiConfig.voiceClient;
      
      if (!ttsClient) {
        console.warn('[SUMMARY-UPLOAD] ⚠️ Voice client not initialized, skipping TTS');
      } else {
        const voice = req.body.voice || 'alloy';
        console.log('[SUMMARY-UPLOAD] TTS voice:', voice);
        
        // Try primary model first, fallback if needed
        let mp3;
        try {
          mp3 = await ttsClient.audio.speech.create({
            model: 'gpt-4o-mini-tts',
            voice,
            input: summary,
          });
          console.log('[SUMMARY-UPLOAD] Using model: gpt-4o-mini-tts');
        } catch (modelErr) {
          if (modelErr?.status === 404 || modelErr?.code === 'model_not_found') {
            console.warn('[SUMMARY-UPLOAD] Primary model not found, using fallback: tts-1');
            mp3 = await ttsClient.audio.speech.create({
              model: 'tts-1',
              voice,
              input: summary,
            });
          } else {
            throw modelErr;
          }
        }
        const buffer = Buffer.from(await mp3.arrayBuffer());
        const audioFilename = `summary-audio-${voice}-${Date.now()}.mp3`;
        const audioPath = path.join('uploads', audioFilename);
        fs.writeFileSync(audioPath, buffer);
        audioPublicUrl = `${req.protocol}://${req.get('host')}/uploads/${audioFilename}`;
        console.log('[SUMMARY-UPLOAD] ✅ TTS audio generated:', audioFilename);
      }
    } catch (ttsErr) {
      console.warn('[SUMMARY-UPLOAD] ⚠️ TTS generation failed (non-critical):', ttsErr.message || ttsErr);
    }

    // Create StudyMaterial entry if user is authenticated
    console.log('[SUMMARY-UPLOAD] Step 4: Creating material record (if authenticated)...');
    let createdMaterial = null;
    try {
      const userId = req.userId;
      if (userId) {
        console.log('[SUMMARY-UPLOAD] Creating material for userId:', userId);
        
        // Determine fileType
        let fileType = 'text';
        if (mimeType === 'application/pdf') fileType = 'pdf';
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') fileType = 'docx';
        else if (mimeType === 'text/plain') fileType = 'text';

        const serverFilePath = filePath;
        const materialData = {
          userId,
          title: req.file.originalname || 'Uploaded File',
          content: text,
          summary,
          fileUrl: fileUrl,
          filePath: serverFilePath,
          fileType,
          createdAt: db.FieldValue.serverTimestamp(),
          updatedAt: db.FieldValue.serverTimestamp(),
        };

        const materialRef = await db.collection('materials').add(materialData);
        createdMaterial = { id: materialRef.id, ...materialData };

        await db.collection('users').doc(userId).set(
          {
            studyTopics: db.FieldValue.arrayUnion(materialRef.id),
            updatedAt: db.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log('[SUMMARY-UPLOAD] ✅ Material created with ID:', materialRef.id);
      } else {
        console.log('[SUMMARY-UPLOAD] No userId - skipping material creation (guest upload)');
      }
    } catch (authErr) {
      console.warn('[SUMMARY-UPLOAD] ⚠️ Material creation failed (non-critical):', authErr.message);
    }

    console.log('[SUMMARY-UPLOAD] === File processing complete ===');
    
    // Return summary, file URL and generated audio URL (if created)
    res.json({
      summary,
      fileUrl,
      audioUrl: audioPublicUrl,
      material: createdMaterial,
    });
  } catch (error) {
    console.error('[SUMMARY-UPLOAD] ❌ FATAL ERROR:', error);
    console.error('[SUMMARY-UPLOAD] Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error processing file', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  upload,
  processFile,
};