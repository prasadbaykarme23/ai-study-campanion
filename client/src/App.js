import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useFocusModeStore } from './context/store';

import PageLoader from './components/PageLoader';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MaterialDetail = lazy(() => import('./pages/MaterialDetail'));
const Questions = lazy(() => import('./pages/Questions'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const AskAITutor = lazy(() => import('./pages/AskAITutor'));
const Compiler = lazy(() => import('./pages/Compiler'));
const FileSummarizer = lazy(() => import('./pages/Filesummarize'));
const Landing = lazy(() => import('./pages/Landing'));
const Settings = lazy(() => import('./pages/Settings'));

const FocusModeGuard = ({ children }) => {
  const { isFocusModeActive } = useFocusModeStore();

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isFocusModeActive) {
        e.preventDefault();
        e.returnValue = '';
        alert('⏱️ Focus Mode is active. You must exit Focus Mode before leaving this page.');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFocusModeActive]);

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <PageLoader />;
  }

  return isAuthenticated ? <FocusModeGuard>{children}</FocusModeGuard> : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <PageLoader />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// Component to block navigation during focus mode
const NavigationBlocker = () => {
  const { isFocusModeActive } = useFocusModeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const lastLocationRef = useRef(null);

  useEffect(() => {
    if (isFocusModeActive && lastLocationRef.current && lastLocationRef.current !== location.pathname) {
      // User tried to navigate while focus is active - go back
      navigate(-1);
      alert('⏱️ Focus Mode is active. You cannot navigate. Press "Exit Focus Mode" in the timer to continue.');
    }
    lastLocationRef.current = location.pathname;
  }, [location, isFocusModeActive, navigate]);

  return null;
};

function App() {
  const { isInitialized, initializeAuth, cleanupAuthListener } = useAuthStore();

  useEffect(() => {
    initializeAuth();
    return () => {
      cleanupAuthListener();
    };
  }, [initializeAuth, cleanupAuthListener]);

  if (!isInitialized) {
    return <PageLoader />;
  }

  return (
    <Router>
      <NavigationBlocker />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/summary" element={<ProtectedRoute><FileSummarizer /></ProtectedRoute>} />
          <Route path="/questions" element={<ProtectedRoute><Questions /></ProtectedRoute>} />
          <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
          <Route path="/ask-ai" element={<ProtectedRoute><AskAITutor /></ProtectedRoute>} />
          <Route path="/compiler" element={<FocusModeGuard><Compiler /></FocusModeGuard>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route
            path="/material/:id"
            element={
              <ProtectedRoute>
                <MaterialDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
