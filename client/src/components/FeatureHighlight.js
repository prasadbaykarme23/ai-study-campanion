import React from 'react';
import '../styles/FeatureHighlight.css';

const FeatureHighlight = ({ icon, title, description, image, reverse }) => {
  return (
    <div className={`feature-highlight ${reverse ? 'reverse' : ''}`}>
      <div className="highlight-content">
        <div className="highlight-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="highlight-image">
        <div className="image-placeholder">{image}</div>
      </div>
    </div>
  );
};

export default FeatureHighlight;
