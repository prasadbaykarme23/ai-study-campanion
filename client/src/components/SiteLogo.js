import React from 'react';

const SiteLogo = ({ compact = false }) => {
  return (
    <div className={`site-logo ${compact ? 'compact' : ''}`}>
      <div className="site-logo-mark" aria-hidden="true">
        <div className="site-logo-dot" />
      </div>
      <div className="site-logo-text-wrap">
        <span className="site-logo-title">AI Study</span>
        {!compact && <span className="site-logo-subtitle">Companion</span>}
      </div>
    </div>
  );
};

export default SiteLogo;
