const admin = require('firebase-admin');

const normalizeMultilineSecret = (value = '') => {
  return String(value).replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim();
};

const buildServiceAccountFromEnv = () => {
  const projectId = (process.env.FIREBASE_PROJECT_ID || 'prem-b6c68').trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizeMultilineSecret(process.env.FIREBASE_PRIVATE_KEY || '');

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

const tryParseServiceAccountJson = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawJson);
    return {
      projectId: String(parsed.project_id || parsed.projectId || '').trim(),
      clientEmail: String(parsed.client_email || parsed.clientEmail || '').trim(),
      privateKey: normalizeMultilineSecret(parsed.private_key || parsed.privateKey || ''),
    };
  } catch (error) {
    console.error('[FIREBASE] ❌ FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    return null;
  }
};

const validateServiceAccount = (serviceAccount) => {
  const issues = [];
  if (!serviceAccount.projectId) {
    issues.push('FIREBASE_PROJECT_ID is missing');
  }
  if (!serviceAccount.clientEmail) {
    issues.push('FIREBASE_CLIENT_EMAIL is missing');
  } else if (!serviceAccount.clientEmail.endsWith('.gserviceaccount.com')) {
    issues.push('FIREBASE_CLIENT_EMAIL must be a Firebase service account email (ends with .gserviceaccount.com)');
  }
  if (!serviceAccount.privateKey) {
    issues.push('FIREBASE_PRIVATE_KEY is missing');
  } else if (!serviceAccount.privateKey.includes('BEGIN PRIVATE KEY')) {
    issues.push('FIREBASE_PRIVATE_KEY is not a valid PEM private key');
  }

  return issues;
};

const initializeFirebase = () => {
  try {
    // Preferred source: full service account JSON in a single env var.
    const jsonAccount = tryParseServiceAccountJson();
    const envAccount = buildServiceAccountFromEnv();
    const serviceAccount = jsonAccount || envAccount;
    const issues = validateServiceAccount(serviceAccount);

    // Initialize only if not already initialized
    if (!admin.apps.length) {
      if (issues.length > 0) {
        console.error('[FIREBASE] ❌ Invalid Firebase Admin credentials:');
        issues.forEach((issue) => console.error(`[FIREBASE]   - ${issue}`));
        throw new Error('Firebase Admin credentials are invalid');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const db = admin.firestore();
    console.log('[FIREBASE] ✅ Firestore initialized successfully');
    return db;
  } catch (error) {
    console.error('[FIREBASE] ❌ Error initializing Firestore:', error.message);
    console.error('[FIREBASE] Set either FIREBASE_SERVICE_ACCOUNT_JSON or valid FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in .env');
    console.warn('[FIREBASE] ⚠️  Running without Firestore — all data will be stored in local JSON files.');
    return null;
  }
};

module.exports = initializeFirebase;
