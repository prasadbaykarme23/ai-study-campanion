    import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChange, googleSignIn, emailSignIn, emailSignUp, logout } from '../config/firebaseAuth';

/**
 * Custom hook for Firebase Authentication
 * Manages auth state and provides auth methods
 */
export const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Google sign-in
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await googleSignIn();
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Email sign-in
  const signInWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    const result = await emailSignIn(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Email sign-up
  const signUpWithEmail = useCallback(async (email, password, displayName) => {
    setLoading(true);
    setError(null);
    const result = await emailSignUp(email, password, displayName);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  // Logout
  const userLogout = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await logout();
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout: userLogout,
  };
};

export default useFirebaseAuth;
