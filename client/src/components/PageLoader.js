import React from 'react';
import '../styles/PageLoader.css';

const PageLoader = () => {
  return (
    <div className="page-loader-shell" role="status" aria-live="polite">
      <div className="page-loader-card">
        <div className="page-loader-brand shimmer-block" />
        <div className="page-loader-title shimmer-block" />
        <div className="page-loader-line shimmer-block" />
        <div className="page-loader-line shimmer-block short" />
      </div>
    </div>
  );
};

export default PageLoader;