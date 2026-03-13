#!/usr/bin/env node

/**
 * Firebase Firestore Database Setup Script
 * Automatically creates collections, indexes, and seeds data from JSON files
 * Requires: Node.js 14+, Firebase Admin SDK
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class FirebaseSetup {
  constructor(projectId, serviceAccountPath) {
    this.projectId = projectId;
    this.db = null;
    this.initialized = false;
    this.initializeFirebase(serviceAccountPath);
  }

  initializeFirebase(serviceAccountPath) {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.db = admin.firestore();
        console.log(`${colors.green}✅${colors.reset} Firebase already initialized`);
        this.initialized = true;
        return;
      }

      // Try to load service account from file
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(path.resolve(serviceAccountPath));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: this.projectId
        });
        console.log(`${colors.green}✅${colors.reset} Firebase initialized with: ${serviceAccountPath}`);
      } else {
        throw new Error(`Service account file not found: ${serviceAccountPath}`);
      }

      this.db = admin.firestore();
      this.initialized = true;
      console.log(`${colors.green}✅${colors.reset} Connected to Firestore: ${this.projectId}\n`);

    } catch (error) {
      console.error(`${colors.red}❌${colors.reset} Failed to initialize Firebase:`, error.message);
      process.exit(1);
    }
  }

  async createCollections() {
    console.log(`${colors.cyan}📦 Creating collections...${colors.reset}\n`);

    const collections = [
      'users',
      'studySubjects',
      'materials',
      'flashcards',
      'quizResults'
    ];

    for (const collection of collections) {
      try {
        const snapshot = await this.db.collection(collection).limit(1).get();
        if (snapshot.empty) {
          // Create placeholder and delete it to ensure collection exists
          await this.db.collection(collection).doc('_placeholder').set({
            _temp: true,
            createdAt: new Date()
          });
          await this.db.collection(collection).doc('_placeholder').delete();
          console.log(`${colors.green}✅${colors.reset} Created collection: ${collection}`);
        } else {
          console.log(`${colors.cyan}✓${colors.reset} Collection exists: ${collection}`);
        }
      } catch (error) {
        console.error(`${colors.yellow}⚠️${colors.reset} Note on ${collection}:`, error.message);
      }
    }
    console.log();
  }

  async migrateLocalUsers(dataDir = 'server/data') {
    console.log(`${colors.cyan}👥 Migrating full user records from local-users.json...${colors.reset}\n`);

    const localUsersPath = path.join(dataDir, 'local-users.json');
    if (!fs.existsSync(localUsersPath)) {
      console.log(`${colors.yellow}⚠️${colors.reset} local-users.json not found — skipping user migration`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(localUsersPath, 'utf-8');
      const { users } = JSON.parse(fileContent);

      if (!Array.isArray(users) || users.length === 0) {
        console.log(`${colors.yellow}⚠️${colors.reset} No users found in local-users.json`);
        return;
      }

      let count = 0;
      for (const user of users) {
        const { id, ...userData } = user;
        if (!id) continue;

        // Convert ISO date strings to Date objects
        if (typeof userData.createdAt === 'string') userData.createdAt = new Date(userData.createdAt);
        if (typeof userData.updatedAt === 'string') userData.updatedAt = new Date(userData.updatedAt);

        // Upsert using the original UUID as document ID so materialRef userId links still work
        await this.db.collection('users').doc(id).set(userData, { merge: true });
        count++;
        console.log(`  ${colors.green}✓${colors.reset} Upserted user: ${userData.email || id} (${id})`);
      }

      console.log(`\n${colors.green}✅${colors.reset} Migrated ${count} full user records to Firestore\n`);
    } catch (error) {
      console.error(`${colors.red}❌${colors.reset} Error migrating local users:`, error.message);
    }
  }

  async seedDataFromJson(dataDir = 'server/data') {
    console.log(`${colors.cyan}📥 Seeding data from ${dataDir}...${colors.reset}\n`);

    // Skip col_users.json here — migrateLocalUsers() handles full user records
    const dataMapping = {
      'col_flashcards.json': 'flashcards',
      'col_materials.json': 'materials',
      'col_studySubjects.json': 'studySubjects'
    };

    for (const [jsonFile, collection] of Object.entries(dataMapping)) {
      const filePath = path.join(dataDir, jsonFile);

      if (!fs.existsSync(filePath)) {
        console.log(`${colors.yellow}⚠️${colors.reset} File not found: ${filePath}`);
        continue;
      }

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        let count = 0;
        for (const [docId, docData] of Object.entries(data)) {
          // Ensure timestamps
          if (!docData.createdAt) {
            docData.createdAt = new Date();
          }
          if (!docData.updatedAt) {
            docData.updatedAt = new Date();
          }

          // Convert ISO strings to timestamps
          if (typeof docData.createdAt === 'string') {
            docData.createdAt = new Date(docData.createdAt);
          }
          if (typeof docData.updatedAt === 'string') {
            docData.updatedAt = new Date(docData.updatedAt);
          }

          await this.db.collection(collection).doc(docId).set(docData);
          count++;
        }

        console.log(`${colors.green}✅${colors.reset} Imported ${count} documents to '${collection}' from ${jsonFile}`);

      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error(`${colors.red}❌${colors.reset} Invalid JSON in ${jsonFile}:`, error.message);
        } else {
          console.error(`${colors.red}❌${colors.reset} Error importing ${jsonFile}:`, error.message);
        }
      }
    }
    console.log();
  }

  generateSecurityRules() {
    console.log(`${colors.cyan}🔐 Generating security rules...${colors.reset}\n`);

    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      allow create: if isAuthenticated();
    }
    
    // Study Subjects collection
    match /studySubjects/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }
    
    // Materials collection
    match /materials/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }
    
    // Flashcards collection
    match /flashcards/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }
    
    // Quiz Results collection
    match /quizResults/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

    const rulesFile = 'firestore.rules';
    try {
      fs.writeFileSync(rulesFile, rules);
      console.log(`${colors.green}✅${colors.reset} Security rules saved to: ${rulesFile}`);
      console.log(`\n${colors.yellow}📝${colors.reset} To deploy rules, run:`);
      console.log(`   ${colors.cyan}firebase deploy --only firestore:rules${colors.reset}\n`);
    } catch (error) {
      console.error(`${colors.red}❌${colors.reset} Error saving rules:`, error.message);
    }

    return rules;
  }

  generateIndexes() {
    console.log(`${colors.cyan}📊 Creating Firestore indexes...${colors.reset}\n`);

    const indexes = [
      { collection: 'materials', fields: [{ fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
      { collection: 'flashcards', fields: [{ fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
      { collection: 'studySubjects', fields: [{ fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
      { collection: 'quizResults', fields: [{ fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'completedAt', order: 'DESCENDING' }] }
    ];

    console.log(`${colors.yellow}📝${colors.reset} Recommended indexes configuration:`);
    console.log(`Add the following to firestore.indexes.json:\n`);

    const indexesConfig = {
      indexes: indexes.map(idx => ({
        collectionGroup: idx.collection,
        queryScope: 'COLLECTION',
        fields: idx.fields
      }))
    };

    console.log(JSON.stringify(indexesConfig, null, 2));
    console.log(`\n${colors.yellow}📝${colors.reset} To deploy indexes, run:`);
    console.log(`   ${colors.cyan}firebase deploy --only firestore:indexes${colors.reset}\n`);
  }

  async verifySetup() {
    console.log(`${colors.cyan}✔️ Verifying setup...${colors.reset}\n`);

    try {
      const collections = ['users', 'studySubjects', 'materials', 'flashcards', 'quizResults'];

      for (const collection of collections) {
        const snapshot = await this.db.collection(collection).get();
        const count = snapshot.size;
        console.log(`  ${colors.green}✓${colors.reset} ${collection}: ${count} documents`);
      }

      console.log(`\n${colors.green}✅ Database setup complete!${colors.reset}\n`);

    } catch (error) {
      console.error(`${colors.red}❌${colors.reset} Verification error:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log(`\n${colors.cyan}🚀 Firebase Firestore Database Setup${colors.reset}\n`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);

    // Configuration
    const PROJECT_ID = 'prem-b6c68';
    const DATA_DIR = 'server/data';

    // Check for service account JSON files
    const commonPaths = [
      'prem-b6c68-firebase-adminsdk-fbsvc-1ba8e9b454.json',
      'server/serviceAccountKey.json',
      'serviceAccountKey.json'
    ];

    let serviceAccountPath = null;
    for (const filePath of commonPaths) {
      if (fs.existsSync(filePath)) {
        serviceAccountPath = filePath;
        break;
      }
    }

    if (!serviceAccountPath) {
      throw new Error('No Firebase service account key file found in common locations');
    }

    // Initialize and run setup
    const setup = new FirebaseSetup(PROJECT_ID, serviceAccountPath);

    if (!setup.initialized) {
      throw new Error('Firebase initialization failed');
    }

    await setup.createCollections();
    await setup.migrateLocalUsers(DATA_DIR);
    await setup.seedDataFromJson(DATA_DIR);
    setup.generateSecurityRules();
    setup.generateIndexes();
    await setup.verifySetup();

    // Final instructions
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.yellow}📌 NEXT STEPS:${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`1. Review and deploy security rules:`);
    console.log(`   ${colors.cyan}firebase deploy --only firestore:rules${colors.reset}`);
    console.log(`\n2. Create composite indexes if needed:`);
    console.log(`   ${colors.cyan}firebase deploy --only firestore:indexes${colors.reset}`);
    console.log(`\n3. Test your database in Firebase Console:`);
    console.log(`   ${colors.cyan}https://console.firebase.google.com${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Setup failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});
