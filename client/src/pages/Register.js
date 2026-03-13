import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuthStore } from '../context/store';
import { googleSignIn, githubSignIn } from '../config/firebaseAuth';
import { FaExclamationCircle, FaEye, FaEyeSlash, FaGoogle, FaGithub } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import '../styles/Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register(formData);
      login(response.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirebaseSocialSignup = async (provider) => {
    if (isLoading) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const authResult = provider === 'google' ? await googleSignIn() : await githubSignIn();
      if (!authResult.success || !authResult.user) {
        const authError = new Error(authResult.error || `${provider} sign up failed`);
        authError.code = authResult.code;
        throw authError;
      }

      const idToken = await authResult.user.getIdToken();
      const response = await authService.firebaseLogin({ idToken });
      login(response.data, { source: 'firebase' });
      navigate('/dashboard');
    } catch (err) {
      console.error('[REGISTER] Firebase social auth error:', err);

      if (err.code === 'auth/popup-blocked') {
        setError('Pop-up window was blocked. Please allow pop-ups and try again.');
        return;
      }

      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up cancelled. Please try again.');
        return;
      }

      if (err.code === 'auth/unauthorized-domain') {
        window.location.href = provider === 'google'
          ? authService.getGoogleLoginUrl()
          : authService.getGitHubLoginUrl();
        return;
      }

      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with a different sign-in method for this email.');
        return;
      }

      setError(err.response?.data?.message || err.message || 'Social sign-up failed');
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
            <h1>Join Us Today</h1>
            <p>Create an account to unlock personalized AI study plans and track your progress.</p>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card glass-card">
            <h2>Create Account</h2>
            <p className="subtitle">Fill in the details below to get started.</p>

            {error && (
              <div className="error-message">
                <FaExclamationCircle />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  id="name"
                  placeholder=" "
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="name">Full Name</label>
              </div>

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

              <div className="form-group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder=" "
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="confirmPassword">Confirm Password</label>
              </div>

              <button type="submit" disabled={isLoading} className="auth-btn-primary">
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-divider"><span>or continue with</span></div>

            <div className="social-login">
              <button
                type="button"
                className="btn-social google"
                onClick={() => handleFirebaseSocialSignup('google')}
                disabled={isLoading}
              >
                <FaGoogle />
                Sign up with Google
              </button>
              <button
                type="button"
                className="btn-social github"
                onClick={() => handleFirebaseSocialSignup('github')}
                disabled={isLoading}
              >
                <FaGithub />
                Sign up with GitHub
              </button>
            </div>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Login here</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
