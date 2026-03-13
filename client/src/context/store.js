import { create } from 'zustand';
import { authService } from '../services/api';
import { getCurrentUser, logout as firebaseLogout, onAuthStateChange } from '../config/firebaseAuth';

const parseJwtPayload = (token) => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return null;
    }
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  if (!exp) {
    return false;
  }
  return Date.now() >= exp * 1000;
};

const clearStoredAuth = () => {
  sessionStorage.removeItem('token');
  localStorage.removeItem('token');
  sessionStorage.removeItem('authSource');
  localStorage.removeItem('authSource');
};

export const useAuthStore = create((set, get) => ({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  token: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  welcomeMessage: null,
  authSource: null,
  authUnsubscribe: null,

  initializeAuth: () => {
    const existingUnsubscribe = get().authUnsubscribe;
    if (existingUnsubscribe) {
      existingUnsubscribe();
      set({ authUnsubscribe: null });
    }

    set({ isLoading: true, error: null });

    const clearClientSession = (error = null) => {
      clearStoredAuth();
      useMaterialStore.getState().setMaterials([]);
      useQuizStore.getState().setQuizzes([]);
      useQuizStore.getState().setResults([]);
      set({
        user: null,
        firebaseUser: null,
        isAuthenticated: false,
        token: null,
        isLoading: false,
        isInitialized: true,
        error,
        welcomeMessage: null,
        authSource: null,
      });
    };

    const applyAuthenticatedSession = ({ token: nextToken, user, firebaseUser, authSource: nextAuthSource }) => {
      sessionStorage.setItem('token', nextToken);
      localStorage.removeItem('token');
      sessionStorage.setItem('authSource', nextAuthSource);
      localStorage.removeItem('authSource');
      set({
        user,
        firebaseUser,
        isAuthenticated: true,
        token: nextToken,
        isLoading: false,
        isInitialized: true,
        error: null,
        authSource: nextAuthSource,
      });
    };

    const restoreFromBackendToken = async (activeToken, activeAuthSource, firebaseUser = null) => {
      if (!activeToken || isTokenExpired(activeToken)) {
        clearClientSession();
        return;
      }

      try {
        const response = await authService.getProfile();
        applyAuthenticatedSession({
          token: activeToken,
          user: response?.data || null,
          firebaseUser,
          authSource: activeAuthSource || 'backend',
        });
      } catch (error) {
        clearClientSession(error.message);
      }
    };

    const restoreFromFirebaseUser = async (firebaseUser) => {
      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await authService.firebaseLogin({ idToken });
        applyAuthenticatedSession({
          token: response?.data?.token,
          user: response?.data?.user || null,
          firebaseUser,
          authSource: 'firebase',
        });
      } catch (error) {
        clearClientSession(error.message);
      }
    };

    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      const activeToken = sessionStorage.getItem('token') || localStorage.getItem('token');
      const activeAuthSource = sessionStorage.getItem('authSource') || localStorage.getItem('authSource') || get().authSource;

      if (firebaseUser) {
        if (activeToken && !isTokenExpired(activeToken)) {
          await restoreFromBackendToken(activeToken, activeAuthSource || 'firebase', firebaseUser);
          return;
        }

        await restoreFromFirebaseUser(firebaseUser);
        return;
      }

      if (activeToken && activeAuthSource === 'backend') {
        await restoreFromBackendToken(activeToken, 'backend', null);
        return;
      }

      clearClientSession();
    });

    set({ authUnsubscribe: unsubscribe });

    const currentFirebaseUser = getCurrentUser();
    const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
    const currentAuthSource = sessionStorage.getItem('authSource') || localStorage.getItem('authSource') || get().authSource;

    if (currentFirebaseUser) {
      if (currentToken && !isTokenExpired(currentToken)) {
        restoreFromBackendToken(currentToken, currentAuthSource || 'firebase', currentFirebaseUser);
      } else {
        restoreFromFirebaseUser(currentFirebaseUser);
      }
      return null;
    }

    if (currentToken && currentAuthSource === 'backend' && !isTokenExpired(currentToken)) {
      restoreFromBackendToken(currentToken, 'backend', null);
      return null;
    }

    return null;
  },

  login: async (data, options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const token = data.token;
      const authSource = options.source || 'backend';
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token');
      sessionStorage.setItem('authSource', authSource);
      localStorage.removeItem('authSource');
      set({
        user: data.user,
        firebaseUser: getCurrentUser(),
        token,
        isAuthenticated: true,
        isLoading: false,
        welcomeMessage: `Welcome ${data.user.name}`,
        authSource,
        isInitialized: true,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  logout: async () => {
    await firebaseLogout();
    clearStoredAuth();
    useMaterialStore.getState().setMaterials([]);
    useQuizStore.getState().setQuizzes([]);
    useQuizStore.getState().setResults([]);
    set({
      user: null,
      firebaseUser: null,
      token: null,
      isAuthenticated: false,
      welcomeMessage: null,
      authSource: null,
    });
  },

  cleanupAuthListener: () => {
    const unsubscribe = get().authUnsubscribe;
    if (unsubscribe) {
      unsubscribe();
    }
    set({ authUnsubscribe: null });
    return null;
  },

  clearWelcome: () => set({ welcomeMessage: null }),

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

export const useMaterialStore = create((set) => ({
  materials: [],
  isLoading: false,
  error: null,

  setMaterials: (materials) => set({ materials }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const useQuizStore = create((set) => ({
  quizzes: [],
  results: [],
  isLoading: false,
  error: null,

  setQuizzes: (quizzes) => set({ quizzes }),
  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const useFocusModeStore = create((set) => ({
  isFocusModeActive: false,
  setFocusModeActive: (isActive) => set({ isFocusModeActive: isActive }),
}));
