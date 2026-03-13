import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from './firebase';

// Initialize persistence once and wait for it before interactive auth calls.
const persistenceReady = setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error('Persistence error:', error);
});

let activeGooglePopupPromise = null;
let activeGitHubPopupPromise = null;

/**
 * Sign in with Google
 */
export const googleSignIn = async () => {
  if (activeGooglePopupPromise) {
    return activeGooglePopupPromise;
  }

  activeGooglePopupPromise = (async () => {
  try {
    await persistenceReady;
    const result = await signInWithPopup(auth, googleProvider);
    return {
      success: true,
      user: result.user,
      message: 'Google sign-in successful',
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  } finally {
    activeGooglePopupPromise = null;
  }
  })();

  return activeGooglePopupPromise;
};

/**
 * Sign in with GitHub
 */
export const githubSignIn = async () => {
  if (activeGitHubPopupPromise) {
    return activeGitHubPopupPromise;
  }

  activeGitHubPopupPromise = (async () => {
    try {
      await persistenceReady;
      const result = await signInWithPopup(auth, githubProvider);
      return {
        success: true,
        user: result.user,
        message: 'GitHub sign-in successful',
      };
    } catch (error) {
      console.error('GitHub sign-in error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    } finally {
      activeGitHubPopupPromise = null;
    }
  })();

  return activeGitHubPopupPromise;
};

/**
 * Sign in with Email and Password
 */
export const emailSignIn = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: result.user,
      message: 'Sign in successful',
    };
  } catch (error) {
    console.error('Email sign-in error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

/**
 * Sign up with Email and Password
 */
export const emailSignUp = async (email, password, displayName = '') => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    
    return {
      success: true,
      user: result.user,
      message: 'Account created successfully',
    };
  } catch (error) {
    console.error('Email sign-up error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

/**
 * Sign out
 */
export const logout = async () => {
  try {
    await signOut(auth);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Listen to authentication state changes
 */
export const onAuthStateChange = (callback) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    callback(user);
  });
  return unsubscribe;
};

/**
 * Get user token
 */
export const getUserToken = async () => {
  try {
    const user = getCurrentUser();
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
};

export default auth;
