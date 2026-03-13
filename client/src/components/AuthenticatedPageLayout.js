import React from 'react';
import AuthNavbar from './AuthNavbar';
import '../styles/AuthenticatedPageLayout.css';

const AuthenticatedPageLayout = ({ children }) => {
  return (
    <div className="auth-page-shell">
      <div className="auth-navbar-wrapper">
        <div className="auth-navbar-inner">
          <AuthNavbar />
        </div>
      </div>

      <main className="auth-page-content">
        {children}
      </main>
    </div>
  );
};

export default AuthenticatedPageLayout;
