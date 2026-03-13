# Firebase Authentication & Database Setup

## ✅ Setup Complete

Your Firebase integration is now fully configured with proper authentication and database connection.

## 📁 New Files Created

### 1. **firebaseAuth.js** - Authentication Functions
Located: `src/config/firebaseAuth.js`

Provides functions for:
- ✅ Google Sign-In
- ✅ Email/Password Sign-In
- ✅ Email/Password Sign-Up
- ✅ Logout
- ✅ Password Reset
- ✅ Get Current User
- ✅ Listen to Auth State Changes
- ✅ Get User Token

### 2. **firebaseDatabase.js** - Firestore Database Operations
Located: `src/services/firebaseDatabase.js`

Provides functions for:
- ✅ Get single document
- ✅ Get all documents
- ✅ Query documents with filters
- ✅ Add new document
- ✅ Update document
- ✅ Delete document
- ✅ Real-time listeners for documents
- ✅ Real-time listeners for collections
- ✅ Batch write operations

### 3. **useFirebaseAuth Hook** - React Hook
Located: `src/hooks/useFirebaseAuth.js`

A custom React hook that provides:
- Auth state management
- Sign-in/Sign-up methods
- Logout functionality
- Loading and error states
- Easy integration in React components

### 4. **firebase.js** - Enhanced Configuration
Updated: `src/config/firebase.js`

Now includes:
- Firestore Database initialization (`db`)
- Firebase Storage initialization (`storage`)
- Enhanced Google Auth Provider with scopes
- Analytics support

## 🚀 Quick Start

### Authentication Examples:

```javascript
// Google Sign-In
import { googleSignIn } from '../config/firebaseAuth';

const result = await googleSignIn();
if (result.success) {
  console.log('User:', result.user.email);
}
```

```javascript
// Email Sign-In
import { emailSignIn } from '../config/firebaseAuth';

const result = await emailSignIn('user@example.com', 'password');
if (result.success) {
  console.log('Logged in:', result.user.email);
}
```

```javascript
// In React Component
import useFirebaseAuth from '../hooks/useFirebaseAuth';

function MyComponent() {
  const { user, signInWithGoogle, logout } = useFirebaseAuth();
  
  return (
    <div>
      {user ? (
        <>
          <p>Welcome {user.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={signInWithGoogle}>Sign in with Google</button>
      )}
    </div>
  );
}
```

### Database Examples:

```javascript
// Add Document
import { addDocument } from '../services/firebaseDatabase';

const result = await addDocument('users', {
  name: 'John',
  email: 'john@example.com',
});

if (result.success) {
  console.log('Added with ID:', result.data.id);
}
```

```javascript
// Query Documents
import { queryDocuments, filters } from '../services/firebaseDatabase';

const result = await queryDocuments('users', [
  filters.whereEqual('age', 25),
  filters.orderByField('name', 'asc'),
  filters.limitTo(10),
]);

if (result.success) {
  console.log('Results:', result.data);
}
```

```javascript
// Real-time Listener
import { onCollectionChange } from '../services/firebaseDatabase';
import { useEffect, useState } from 'react';

function UsersList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = onCollectionChange('users', [], (result) => {
      if (result.success) {
        setUsers(result.data);
      }
    });

    return unsubscribe; // Cleanup
  }, []);

  return <div>{users.map(u => <p key={u.id}>{u.name}</p>)}</div>;
}
```

## 📊 Available Methods

### Authentication (`firebaseAuth.js`)
- `googleSignIn()` - Sign in with Google
- `emailSignIn(email, password)` - Sign in with email
- `emailSignUp(email, password, displayName)` - Create new account
- `logout()` - Sign out
- `resetPassword(email)` - Send password reset email
- `getCurrentUser()` - Get current firebase user
- `onAuthStateChange(callback)` - Listen to auth changes
- `getUserToken()` - Get authentication token

### Database (`firebaseDatabase.js`)
- `getDocument(collection, docId)` - Get single doc
- `getDocuments(collection)` - Get all docs
- `queryDocuments(collection, filters)` - Query with filters
- `addDocument(collection, data)` - Create new doc
- `updateDocument(collection, docId, data)` - Update doc
- `deleteDocument(collection, docId)` - Delete doc
- `onDocumentChange(collection, docId, callback)` - Watch doc
- `onCollectionChange(collection, filters, callback)` - Watch collection
- `batchWrite(operations)` - Bulk operations

### Query Filters
- `filters.whereEqual(field, value)`
- `filters.whereLessThan(field, value)`
- `filters.whereGreaterThan(field, value)`
- `filters.whereIn(field, values)`
- `filters.orderByField(field, 'asc'|'desc')`
- `filters.limitTo(count)`

## 🔐 Firebase Configuration

Your Firebase project is configured with:
- **Project ID**: `prem-b6c68`
- **Storage Bucket**: `prem-b6c68.firebasestorage.app`
- **Auth Domain**: `prem-b6c68.firebaseapp.com`

Firestore Collections needed (create in Firebase Console):
- `users` - User data
- `materials` - Study materials
- `flashcards` - Flashcard sets
- `quizzes` - Quiz questions
- Add more as needed

## 🛠️ Enable Firestore Security Rules

In Firebase Console, set your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Allow public read on materials
    match /materials/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Allow authenticated users to read their flashcards
    match /flashcards/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📝 Response Format

All functions return a consistent format:

```javascript
// Success
{
  success: true,
  data: {...},
  message: "Operation successful"
}

// Error
{
  success: false,
  error: "Error message",
  code: "error_code" // Firebase error code if applicable
}
```

## 🧹 Error Handling

All functions handle errors gracefully:

```javascript
const result = await addDocument('users', data);
if (!result.success) {
  console.error('Error:', result.error); // User-friendly message
  console.error('Code:', result.code);   // Firebase error code
}
```

## 📚 For More Examples

See: `src/docs/FIREBASE_USAGE_EXAMPLES.js` for 11+ detailed examples.

## 🔗 Integration with Your Backend

Your existing backend is still compatible. To use both:

```javascript
import { googleSignIn } from '../config/firebaseAuth';
import { useAuthStore } from '../context/store';

const result = await googleSignIn();
if (result.success) {
  // Get token and sync with backend
  const token = await result.user.getIdToken();
  
  // Store in your auth store
  login({
    token,
    user: {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName,
    }
  });
}
```

## ✨ What's Next

1. **Create Firestore Collections** in Firebase Console
2. **Add Security Rules** for Firestore
3. **Update React Components** to use the new auth hook
4. **Test Real-time Features** with onCollectionChange
5. **Implement Batch Operations** for complex flows

---

**All Firebase functionality is now ready to use!** 🎉
