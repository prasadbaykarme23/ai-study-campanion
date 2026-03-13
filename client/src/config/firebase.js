import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCiEYGPgyhk00C6n3xIwgYi5x3ERkjCgNQ',
  authDomain: 'prem-b6c68.firebaseapp.com',
  projectId: 'prem-b6c68',
  storageBucket: 'prem-b6c68.firebasestorage.app',
  messagingSenderId: '846800835878',
  appId: '1:846800835878:web:b5f7daea3a20becff11de7',
  measurementId: 'G-JX88ZYZ7JB',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Configure GitHub Auth Provider
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

// Initialize Analytics (optional)
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => {
    // Analytics is optional and should not block auth.
  });
}

export { app, auth, db, storage, googleProvider, githubProvider };
