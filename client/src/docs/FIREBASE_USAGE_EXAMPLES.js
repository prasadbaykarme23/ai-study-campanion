/**
 * FIREBASE SETUP COMPLETE - USAGE EXAMPLES
 * 
 * Three main components are now set up:
 * 1. firebaseAuth.js - Authentication functions
 * 2. firebaseDatabase.js - Firestore database operations
 * 3. useFirebaseAuth hook - React hook for auth state
 */

// ============================================
// EXAMPLE 1: LOGIN WITH GOOGLE
// ============================================
import { googleSignIn } from '../config/firebaseAuth';

const handleGoogleLogin = async () => {
  const result = await googleSignIn();
  if (result.success) {
    console.log('Logged in:', result.user.email);
    // Redirect to dashboard
  } else {
    console.error('Login failed:', result.error);
  }
};

// ============================================
// EXAMPLE 2: LOGIN WITH EMAIL & PASSWORD
// ============================================
import { emailSignIn } from '../config/firebaseAuth';

const handleEmailLogin = async (email, password) => {
  const result = await emailSignIn(email, password);
  if (result.success) {
    console.log('Logged in:', result.user.email);
  } else {
    console.error('Login failed:', result.error);
  }
};

// ============================================
// EXAMPLE 3: SIGN UP WITH EMAIL & PASSWORD
// ============================================
import { emailSignUp } from '../config/firebaseAuth';

const handleSignUp = async (email, password, displayName) => {
  const result = await emailSignUp(email, password, displayName);
  if (result.success) {
    console.log('Account created:', result.user.email);
  } else {
    console.error('Sign up failed:', result.error);
  }
};

// ============================================
// EXAMPLE 4: USE FIREBASE AUTH HOOK IN COMPONENT
// ============================================
import useFirebaseAuth from '../hooks/useFirebaseAuth';
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, logout } = useFirebaseAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <button onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    );
  }

  return (
    <div>
      <p>Welcome {user.displayName || user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// ============================================
// EXAMPLE 5: FIRESTORE - ADD DOCUMENT
// ============================================
import { addDocument } from '../services/firebaseDatabase';

const handleAddUser = async () => {
  const result = await addDocument('users', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
  });
  
  if (result.success) {
    console.log('User added with ID:', result.data.id);
  }
};

// ============================================
// EXAMPLE 6: FIRESTORE - GET DOCUMENTS
// ============================================
import { getDocuments } from '../services/firebaseDatabase';
import { useState, useEffect } from 'react';

function UsersList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await getDocuments('users');
      if (result.success) {
        setUsers(result.data);
      }
    };
    fetchUsers();
  }, []);

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// ============================================
// EXAMPLE 7: FIRESTORE - QUERY DOCUMENTS
// ============================================
import { queryDocuments, filters } from '../services/firebaseDatabase';

const handleQueryUsers = async () => {
  const result = await queryDocuments('users', [
    filters.whereEqual('age', 25),
    filters.orderByField('name', 'asc'),
    filters.limitTo(10),
  ]);
  
  if (result.success) {
    console.log('Found users:', result.data);
  }
};

// ============================================
// EXAMPLE 8: FIRESTORE - UPDATE DOCUMENT
// ============================================
import { updateDocument } from '../services/firebaseDatabase';

const handleUpdateUser = async (userId) => {
  const result = await updateDocument('users', userId, {
    age: 26,
    updated: true,
  });
  
  if (result.success) {
    console.log('User updated');
  }
};

// ============================================
// EXAMPLE 9: FIRESTORE - DELETE DOCUMENT
// ============================================
import { deleteDocument } from '../services/firebaseDatabase';

const handleDeleteUser = async (userId) => {
  const result = await deleteDocument('users', userId);
  
  if (result.success) {
    console.log('User deleted');
  }
};

// ============================================
// EXAMPLE 10: FIRESTORE - REAL-TIME LISTENER
// ============================================
import { onCollectionChange } from '../services/firebaseDatabase';
import { useState, useEffect } from 'react';

function RealtimeUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = onCollectionChange('users', [], (result) => {
      if (result.success) {
        setUsers(result.data);
      }
    });

    return unsubscribe; // Clean up listener on unmount
  }, []);

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 11: BATCH WRITE OPERATIONS
// ============================================
import { batchWrite } from '../services/firebaseDatabase';

const handleBatchOperations = async () => {
  const result = await batchWrite([
    {
      type: 'set',
      collection: 'users',
      id: 'user1',
      data: { name: 'John', email: 'john@example.com' }
    },
    {
      type: 'update',
      collection: 'users',
      id: 'user2',
      data: { age: 30 }
    },
    {
      type: 'delete',
      collection: 'users',
      id: 'user3'
    }
  ]);

  if (result.success) {
    console.log('Batch operations completed');
  }
};

// ============================================
// INTEGRATION WITH YOUR EXISTING AUTH STORE
// ============================================
import { useAuthStore } from '../context/store';
import useFirebaseAuth from '../hooks/useFirebaseAuth';

function LoginPage() {
  const { login } = useAuthStore();
  const { signInWithGoogle, loading } = useFirebaseAuth();

  const handleFirebaseLogin = async () => {
    const result = await signInWithGoogle();
    if (result.success) {
      // Get Firebase token
      const token = await result.user.getIdToken();
      
      // Sync with your backend auth store
      login({
        token,
        user: {
          name: result.user.displayName,
          email: result.user.email,
          uid: result.user.uid,
        }
      });
    }
  };

  return (
    <button onClick={handleFirebaseLogin} disabled={loading}>
      Sign in with Google
    </button>
  );
}

// ============================================
// NPM PACKAGES - Already installed?
// ============================================
// Make sure you have these installed:
// npm install firebase

export default {};
