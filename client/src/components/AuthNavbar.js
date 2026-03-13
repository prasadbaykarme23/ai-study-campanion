import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useFocusModeStore } from '../context/store';
import Modal from './Modal';
import { FaBars, FaTimes } from 'react-icons/fa';
import SiteLogo from './SiteLogo';
import '../styles/AuthNavbar.css';

const AuthNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, welcomeMessage, clearWelcome } = useAuthStore();
  const { isFocusModeActive } = useFocusModeStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!welcomeMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      clearWelcome();
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [welcomeMessage, clearWelcome]);

  const handleNavigation = (path) => {
    if (isFocusModeActive) {
      alert('⏱️ Focus Mode is active. Exit focus mode before navigating.');
      return;
    }
    navigate(path);
  };

  const handleLogout = async () => {
    if (isFocusModeActive) {
      alert('⏱️ Focus Mode is active. Exit focus mode before logging out.');
      return;
    }
    setShowProfileMenu(false);
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Summary', path: '/summary' },
    { name: 'Questions', path: '/questions' },
    { name: 'Flashcards', path: '/flashcards' },
    { name: 'Ask AI Tutor', path: '/ask-ai' },
    { name: 'Compiler', path: '/compiler' },
  ];

  return (
    <nav className={`dashboard-navbar glass-panel ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-left">
        <div className="navbar-brand hover-lift" onClick={() => handleNavigation('/dashboard')} style={{ cursor: 'pointer' }}>
          <SiteLogo compact />
        </div>
      </div>

      <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
        {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
      </button>

      <div className={`navbar-menus-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="navbar-center">
          {user && (
            <nav className="feature-nav">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  className={`nav-link ${location.pathname === link.path ? 'active' : ''} ${isFocusModeActive ? 'disabled' : ''}`}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleNavigation(link.path);
                  }}
                >
                  {link.name}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="navbar-right">
          {user ? (
            <div className="profile-section" ref={dropdownRef}>
              <button
                className="profile-btn profile-box hover-lift"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="profile-avatar-img">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="profile-name">{user?.name || 'User'}</span>
                <span className="dropdown-arrow" style={{ transform: showProfileMenu ? 'rotate(180deg)' : 'none' }}>▼</span>
              </button>

              {showProfileMenu && (
                <div className="profile-menu animate-fade-in">
                  <div className="profile-menu-header">
                    <p className="user-name-dropdown">{user?.name || 'User'}</p>
                    <p className="user-email">{user?.email || 'No email'}</p>
                  </div>
                  <div className="profile-menu-actions">
                    <button className="profile-menu-item" onClick={() => { setShowProfileMenu(false); handleNavigation('/dashboard'); }}>
                      📊 Dashboard
                    </button>
                    <button className="profile-menu-item" onClick={() => { setShowProfileMenu(false); handleNavigation('/settings'); }}>
                      ⚙️ Settings
                    </button>
                    <div className="dropdown-divider"></div>
                    <button
                      className="profile-menu-item logout-btn"
                      onClick={handleLogout}
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-actions">
              <button className="btn btn-ghost" onClick={() => { setIsMobileMenuOpen(false); handleNavigation('/login'); }}>Login</button>
              <button className="btn btn-primary" onClick={() => { setIsMobileMenuOpen(false); handleNavigation('/signup'); }}>Sign Up</button>
            </div>
          )}
        </div>
      </div>

      <Modal show={!!welcomeMessage} title="Welcome" onClose={() => clearWelcome()}>
        <div className="welcome-popup-content">
          <h2 className="welcome-title">Welcome back! 🎉</h2>
          <p className="welcome-text">{welcomeMessage}</p>
        </div>
      </Modal>
    </nav>
  );
};

export default AuthNavbar;
