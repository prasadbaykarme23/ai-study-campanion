import React, { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusModeStore } from '../context/store';
import { formatSafeDate } from '../utils/dateFormatter';
import '../styles/MaterialCard.css';

const MaterialCard = ({ material }) => {
  const navigate = useNavigate();
  const { isFocusModeActive } = useFocusModeStore();

  const handleCardClick = useCallback(() => {
    if (isFocusModeActive) {
      alert('⏱️ Focus Mode is active. Exit focus mode before viewing materials.');
      return;
    }
    navigate(`/material/${material.id}`);
  }, [isFocusModeActive, material.id, navigate]);

  return (
    <div className={`material-card ${isFocusModeActive ? 'disabled' : ''}`}>
      <div className="card-header">
        <h3>{material.title}</h3>
        <span className="type-badge">{material.fileType}</span>
      </div>

      {material.summary && (
        <div className="card-summary">
          <p>{material.summary.substring(0, 150)}...</p>
        </div>
      )}

      {material.keyTopics && material.keyTopics.length > 0 && (
        <div className="card-topics">
          {material.keyTopics.slice(0, 3).map((topic, idx) => (
            <span key={idx} className="mini-tag">
              {topic}
            </span>
          ))}
          {material.keyTopics.length > 3 && (
            <span className="mini-tag">+{material.keyTopics.length - 3}</span>
          )}
        </div>
      )}

      <div className="card-footer">
        <small>{formatSafeDate(material.createdAt, 'Upload date unavailable')}</small>
        <button
          className="btn-link"
          onClick={handleCardClick}
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

export default memo(MaterialCard);
