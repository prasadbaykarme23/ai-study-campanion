# Firebase Firestore Automatic Setup Guide

## Prerequisites

1. **Firebase Project Created**: Your Firebase project ID is `prem-b6c68`
2. **Service Account Key**: Download from Firebase Console → Project Settings → Service Accounts
3. **Node.js 14+**: Installed on your system

## Quick Start

### Step 1: Get Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `prem-b6c68`
3. Navigate to: **Project Settings** → **Service Accounts**
4. Click **Generate new private key**
5. Save the JSON file as `serviceAccountKey.json` in your project root or `server/` folder

### Step 2: Set Up Environment

```bash
# Navigate to project root
cd d:\ai

# Install dependencies
npm install
```

### Step 3: Configure Credentials (Choose One)

**Option A: Using JSON file (Recommended)**
```bash
# Place serviceAccountKey.json in project root
# The script will find it automatically
```

**Option B: Using Environment Variables**
```bash
# In server/.env file, add:
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"prem-b6c68",...}
```

### Step 4: Run the Setup Script

```bash
node scripts/firebase/setup-firebase-db.js
```

## What the Script Does

✅ Creates 5 Firestore collections:
  - `users` - User accounts
  - `studySubjects` - Study categories
  - `materials` - Learning materials (PDFs, documents)
  - `flashcards` - Flashcard data
  - `quizResults` - Quiz performance tracking

✅ Imports data from existing JSON files:
  - `server/data/col_users.json`
  - `server/data/col_flashcards.json`
  - `server/data/col_materials.json`
  - `server/data/col_studySubjects.json`

✅ Generates security rules (saved to `firestore.rules`)

✅ Provides index recommendations

✅ Verifies the setup

## Output Files

- `firestore.rules` - Security rules (review before deploying)
- `scripts/firebase/setup-firebase-db.js` - The main setup script

## Deploy to Firebase

After running the script successfully:

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy composite indexes (if recommended)
firebase deploy --only firestore:indexes
```

## Troubleshooting

### Error: "Service account credentials not found"
- Ensure `serviceAccountKey.json` is in the project root
- Or set `FIREBASE_SERVICE_ACCOUNT` environment variable

### Error: "Project ID mismatch"
- Check that your Firebase project ID is `prem-b6c68`
- Update `PROJECT_ID` in the script if different

### Error: "Permission denied"
- Check that your service account has Firestore admin permissions
- Go to Firebase Console → IAM & Admin → Grant Editor role

### Error: "Import failed"
- Ensure JSON files exist in `server/data/`
- Check JSON file formatting is valid

## Manual Alternative

If you prefer manual setup:

```bash
# Initialize Firebase CLI
firebase login

# Set your project
firebase use prem-b6c68

# Deploy
firebase deploy
```

## Security Notes

⚠️ **Important:**
- Never commit `serviceAccountKey.json` to version control
- Add to `.gitignore`:
  ```
  serviceAccountKey.json
  server/.env
  ```
- The generated security rules enforce owner-only access
- All operations require authentication (Firebase Auth)

## Support

For issues with Firebase setup, check:
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/firestore/quickstart)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
