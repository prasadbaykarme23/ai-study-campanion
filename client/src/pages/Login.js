import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuthStore } from '../context/store';
import { emailSignIn, googleSignIn, resetPassword } from '../config/firebaseAuth';
import { FaExclamationCircle, FaEye, FaEyeSlash, FaGoogle, FaGithub } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import '../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getFirebaseEmailErrorMessage = (code, fallbackMessage) => {
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Email/password is not valid for this Firebase account. If this account was created with Google or GitHub, continue with that provider.';
    }

    if (code === 'auth/too-many-requests') {
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    }

    if (code === 'auth/user-disabled') {
      return 'This Firebase account is disabled. Contact support.';
    }

    return fallbackMessage || 'Email login failed.';
  };

  useEffect(() => {
    const syncOAuthLogin = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const socialError = params.get('error');

      if (socialError) {
        setError('Social login failed. Please try again.');
        return;
      }

      if (!token) {
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token');
        const profileResponse = await authService.getProfile();
        login({ token, user: profileResponse.data }, { source: 'firebase' });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        setError('Unable to complete social login.');
      } finally {
        setIsLoading(false);
      }
    };

    syncOAuthLogin();
  }, [location.search, login, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login(formData);
      login(response.data);
      navigate('/dashboard');
    } catch (err) {
      const backendMessage = err.response?.data?.message || '';
      const shouldTryFirebaseEmail =
        backendMessage.toLowerCase().includes('social login') ||
        backendMessage.toLowerCase().includes('google') ||
        backendMessage.toLowerCase().includes('github');

      if (!shouldTryFirebaseEmail) {
        setError(backendMessage || 'Login failed');
        return;
      }

      // If backend account was created via OAuth but Firebase Email/Password is enabled,
      // sign in with Firebase and exchange token with backend.
      const firebaseResult = await emailSignIn(formData.email, formData.password);
      if (!firebaseResult.success || !firebaseResult.user) {
        if (
          firebaseResult.code === 'auth/invalid-credential' ||
          firebaseResult.code === 'auth/wrong-password' ||
          firebaseResult.code === 'auth/user-not-found'
        ) {
          const resetResult = await resetPassword(formData.email);
          if (resetResult.success) {
            setError('No password is set for this account yet. We sent a password reset link to your email. Set a password there, then sign in with email/password.');
            return;
          }
        }

        setError(getFirebaseEmailErrorMessage(firebaseResult.code, firebaseResult.error || backendMessage));
        return;
      }

      const idToken = await firebaseResult.user.getIdToken();
      const response = await authService.firebaseLogin({ idToken });
      login(response.data, { source: 'firebase' });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirebaseGoogleLogin = async () => {
    if (isLoading) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const authResult = await googleSignIn();
      if (!authResult.success || !authResult.user) {
        const sdkError = new Error(authResult.error || 'Google login failed');
        sdkError.code = authResult.code;
        throw sdkError;
      }

      const idToken = await authResult.user.getIdToken();

      const response = await authService.firebaseLogin({ idToken });
      login(response.data, { source: 'firebase' });
      navigate('/dashboard');
    } catch (err) {
      console.error('[LOGIN] Firebase/Google auth error:', err);

      // Firebase SDK errors (client-side)
      if (err.code === 'auth/configuration-not-found') {
        setError('Google Sign-In is not enabled in Firebase. Contact support or check Firebase Console → Authentication → Sign-in methods.');
        return;
      }

      if (err.code === 'auth/operation-not-supported-in-this-environment') {
        setError('Google Sign-In is not available in this environment. Please use a web browser.');
        return;
      }

      if (err.code === 'auth/unauthorized-domain') {
        window.location.href = authService.getGoogleLoginUrl();
        return;
      }

      if (err.code === 'auth/popup-blocked') {
        setError('Pop-up window was blocked. Please allow pop-ups and try again.');
        return;
      }

      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
        return;
      }

      // Backend API errors
      if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Google Sign-In is not configured. Please contact support.');
        return;
      }

      if (err.response?.status === 401) {
        setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        return;
      }

      // Generic error
      const message = err.response?.data?.message || err.message || 'Google login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-split-container">

        <div className="auth-illustration-side">
          <div className="auth-illustration-content">
            <h1>Welcome Back</h1>
            <p>Continue your learning journey with our AI-powered study companion.</p>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card glass-card">
            <h2>Login</h2>
            <p className="subtitle">Please enter your details to sign in.</p>

            {error && (
              <div className="error-message">
                <FaExclamationCircle />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder=" "
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="email">Email Address</label>
              </div>

              <div className="form-group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  placeholder=" "
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <button type="submit" disabled={isLoading} className="auth-btn-primary">
                {isLoading ? 'Logging In...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider"><span>or continue with</span></div>

            <div className="social-login">
              <button
                type="button"
                className="btn-social google"
                onClick={handleFirebaseGoogleLogin}
                disabled={isLoading}
              >
                <FaGoogle />
                Sign in with Google
              </button>
              <button
                type="button"
                className="btn-social github"
                onClick={() => {
                  window.location.href = authService.getGitHubLoginUrl();
                }}
              >
                <FaGithub />
                Sign in with GitHub
              </button>
            </div>

            <div className="auth-footer">
              Don't have an account? <Link to="/signup">Register here</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
