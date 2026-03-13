/**
 * Backend Server Health Check & Diagnostics
 * Run this with: node server-diagnostic.js
 */

require('dotenv').config();

console.log('='.repeat(70));
console.log('SERVER DIAGNOSTIC CHECK');
console.log('='.repeat(70));

// 1. Environment Variables Check
console.log('\n[1/6] Checking Environment Variables...');
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'JWT_SECRET',
  'OPENAI_API_KEY'
];

requiredEnvVars.forEach(varName => {
  const exists = !!process.env[varName];
  const symbol = exists ? '✅' : '❌';
  const length = exists ? process.env[varName].length : 0;
  console.log(`  ${symbol} ${varName}: ${exists ? `Set (${length} chars)` : 'MISSING'}`);
});

// 2. Required modules check
console.log('\n[2/6] Checking Required Modules...');
const requiredModules = [
  'express',
  'firebase-admin',
  'jsonwebtoken',
  'multer',
  'openai',
  'bcryptjs',
  'cors',
  'dotenv'
];

requiredModules.forEach(moduleName => {
  try {
    require(moduleName);
    console.log(`  ✅ ${moduleName}`);
  } catch (error) {
    console.log(`  ❌ ${moduleName} - NOT INSTALLED`);
  }
});

// 3. File structure check
console.log('\n[3/6] Checking Project Structure...');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/index.js',
  'src/config/database.js',
  'src/config/openai.js',
  'src/middleware/auth.js',
  'src/middleware/optionalAuth.js',
  'src/middleware/rateLimiter.js',
  'src/routes/summaryRoutes.js',
  'src/routes/ttsRoutes.js',
  'src/controllers/summaryController.js',
  'src/controllers/ttsController.js'
];

requiredFiles.forEach(filePath => {
  const exists = fs.existsSync(filePath);
  const symbol = exists ? '✅' : '❌';
  console.log(`  ${symbol} ${filePath}`);
});

// 4. Check uploads directory
console.log('\n[4/6] Checking Uploads Directory...');
if (!fs.existsSync('uploads')) {
  console.log('  ⚠️  uploads/ directory does not exist, creating...');
  fs.mkdirSync('uploads');
  console.log('  ✅ uploads/ directory created');
} else {
  console.log('  ✅ uploads/ directory exists');
}

// 5. Test OpenAI configuration
console.log('\n[5/6] Testing OpenAI Configuration...');
try {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('  ✅ OpenAI client initialized');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('  ⚠️  Warning: OPENAI_API_KEY is not set');
  } else {
    console.log(`  ✅ API Key configured (${process.env.OPENAI_API_KEY.substring(0, 10)}...)`);
  }
} catch (error) {
  console.log('  ❌ OpenAI initialization failed:', error.message);
}

// 6. Summary
console.log('\n[6/6] Summary:');
console.log('='.repeat(70));

const allEnvVarsSet = requiredEnvVars.every(v => !!process.env[v]);
const uploadsExists = fs.existsSync('uploads');

if (allEnvVarsSet && uploadsExists) {
  console.log('✅ All checks passed! Server should start successfully.');
  console.log('\nTo start the server:');
  console.log('  npm start     (production)');
  console.log('  npm run dev   (development with auto-reload)');
} else {
  console.log('⚠️  Some issues detected:');
  if (!allEnvVarsSet) {
    console.log('  - Configure missing environment variables in .env file');
  }
  if (!uploadsExists) {
    console.log('  - Uploads directory was created automatically');
  }
}

console.log('\n' + '='.repeat(70));
console.log('DIAGNOSTIC COMPLETE');
console.log('='.repeat(70));
