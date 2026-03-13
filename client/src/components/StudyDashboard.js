import React, { memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import AiAnswerContent from './AiAnswerContent';
import { studySubjectService, materialService, qaService } from '../services/api';
import { useFocusModeStore } from '../context/store';
import { formatSafeDate } from '../utils/dateFormatter';
import '../styles/StudyDashboard.css';

const StudyDashboard = () => {
  const [studyTime, setStudyTime] = useState(() => parseInt(localStorage.getItem('studyTime')) || 0);

  const [normalMinutes, setNormalMinutes] = useState(25);
  const [focusMinutes, setFocusMinutes] = useState(50);
  const [activeTimerType, setActiveTimerType] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [subjectInput, setSubjectInput] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [subjectError, setSubjectError] = useState('');
  const [completionModal, setCompletionModal] = useState({ show: false, message: '' });
  const [isFullscreenFocus, setIsFullscreenFocus] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // New states for in-focus materials access
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [uploadData, setUploadData] = useState({ title: '', content: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [focusQuestion, setFocusQuestion] = useState('');
  const [focusAnswer, setFocusAnswer] = useState('');
  const [focusAskLoading, setFocusAskLoading] = useState(false);
  const [focusAskError, setFocusAskError] = useState('');
  
  // Timer interval ref for proper cleanup
  const timerIntervalRef = useRef(null);
  // Track intentional exit to avoid false triggers
  const isIntentionalExitRef = useRef(false);

  const { setFocusModeActive } = useFocusModeStore();

  useEffect(() => {
    localStorage.setItem('studyTime', studyTime);
  }, [studyTime]);

  useEffect(() => {
    const isFocusActive = activeTimerType === 'focus' && timerActive;
    setFocusModeActive(isFocusActive);
  }, [activeTimerType, timerActive, setFocusModeActive]);

  // Timer countdown effect with proper interval management
  useEffect(() => {
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Start new interval only if timer is active and not paused
    if (timerActive && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
        setStudyTime((prevTime) => prevTime + 1);
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerActive, isPaused]);

  // Timer completion effect
  useEffect(() => {
    if (timerActive && remainingSeconds <= 0) {
      // Mark as intentional exit (timer completed)
      isIntentionalExitRef.current = true;
      
      // Clear interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      setTimerActive(false);
      setIsPaused(false);
      
      // Exit fullscreen if in focus mode
      if (isFullscreenFocus && document.fullscreenElement) {
        document.exitFullscreen().catch((err) => console.error('Error exiting fullscreen:', err));
      }
      setIsFullscreenFocus(false);
      
      const messages = [
        "🎉 Congratulations! You've completed your scheduled study time.",
        "👏 Great job! Don't forget to take a break.",
        "🏆 Study session finished. Keep going!"
      ];
      const m = messages[Math.floor(Math.random() * messages.length)];
      setCompletionModal({ show: true, message: m });
    }
  }, [remainingSeconds, timerActive, isFullscreenFocus]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await studySubjectService.list();
        setSubjects(Array.isArray(response.data?.subjects) ? response.data.subjects : []);
      } catch (error) {
        console.error('Error fetching study subjects:', error);
      }
    };

    fetchSubjects();
  }, []);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;

      // Keep React state in sync with actual browser fullscreen state
      setIsFullscreenFocus(inFullscreen);

      if (!inFullscreen && activeTimerType === 'focus' && timerActive) {
        // User exited fullscreen unexpectedly (not through our buttons)
        if (!isIntentionalExitRef.current) {
          setShowExitConfirm(true);
        }
        // Reset the flag
        isIntentionalExitRef.current = false;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [activeTimerType, timerActive]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isFullscreenFocus && timerActive) {
        setShowTabWarning(true);
      } else if (!document.hidden) {
        setShowTabWarning(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isFullscreenFocus, timerActive]);

  // Prevent accidental page close during focus mode
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isFullscreenFocus && timerActive) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFullscreenFocus, timerActive]);

  // Lock page scroll while focus overlay is active
  useEffect(() => {
    const focusOverlayActive = isFullscreenFocus && activeTimerType === 'focus' && timerActive;
    const previousOverflow = document.body.style.overflow;

    if (focusOverlayActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = previousOverflow || 'auto';
    };
  }, [isFullscreenFocus, activeTimerType, timerActive]);

  const formatDigitalTime = (seconds) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const handleStartTimer = async (type) => {
    const baseMinutes = type === 'focus' ? focusMinutes : normalMinutes;
    const validMinutes = Number(baseMinutes) > 0 ? Number(baseMinutes) : 1;
    const seconds = validMinutes * 60;

    setActiveTimerType(type);
    setRemainingSeconds(seconds);
    setTotalSeconds(seconds);
    setTimerActive(true);
    setIsPaused(false);
    setIsFullscreenFocus(false);
  };

  const handleEnterFocusFullscreen = async () => {
    if (activeTimerType !== 'focus' || !timerActive) {
      return;
    }

    isIntentionalExitRef.current = false;
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreenFocus(true);
    } catch (err) {
      console.error('Error entering fullscreen:', err);
      setIsFullscreenFocus(false);
    }
  };

  const handlePauseTimer = () => {
    setIsPaused(true);
  };

  const handleResumeTimer = () => {
    setIsPaused(false);
  };

  const handleTogglePause = () => {
    if (isPaused) {
      handleResumeTimer();
    } else {
      handlePauseTimer();
    }
  };

  const handleResetTimer = () => {
    if (!activeTimerType) {
      return;
    }

    const baseMinutes = activeTimerType === 'focus' ? focusMinutes : normalMinutes;
    const validMinutes = Number(baseMinutes) > 0 ? Number(baseMinutes) : 1;
    const seconds = validMinutes * 60;

    setRemainingSeconds(seconds);
    setTotalSeconds(seconds);
    setTimerActive(false);
  };

  const handleStopTimer = async () => {
    // Mark this as intentional exit
    isIntentionalExitRef.current = true;
    
    // Clear interval immediately
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Exit fullscreen if active
    if (isFullscreenFocus && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
    
    setTimerActive(false);
    setIsPaused(false);
    setRemainingSeconds(0);
    setTotalSeconds(0);
    setActiveTimerType(null);
    setIsFullscreenFocus(false);
    setShowExitConfirm(false);
  };

  const handleExitConfirmYes = async () => {
    await handleStopTimer();
  };

  const handleExitConfirmNo = async () => {
    isIntentionalExitRef.current = false;
    setShowExitConfirm(false);
    // Re-enter fullscreen
    if (activeTimerType === 'focus' && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error('Error re-entering fullscreen:', err);
      }
    }
  };

  const handleAddSubject = async () => {
    const title = subjectInput.trim();

    if (!title || subjectLoading) {
      return;
    }

    setSubjectLoading(true);
    setSubjectError('');
    try {
      const response = await studySubjectService.add(title);
      const newSubject = response.data?.subject;
      if (newSubject) {
        setSubjects((prev) => [newSubject, ...prev]);
      }
      setSubjectInput('');
    } catch (error) {
      setSubjectError(error.response?.data?.message || 'Failed to add subject. Please try again.');
      console.error('Error adding study subject:', error);
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete || deleteLoading) {
      return;
    }

    const deletingSubject = subjectToDelete;
    const deletingSubjectId = String(deletingSubject.id || '');

    if (!deletingSubjectId) {
      setSubjectError('Invalid subject ID. Please refresh and try again.');
      setSubjectToDelete(null);
      return;
    }

    setDeleteLoading(true);
    setSubjectError('');

    const previousSubjects = subjects;

    setSubjectToDelete(null);
    setSubjects((prev) => prev.filter((subject) => String(subject.id) !== deletingSubjectId));

    try {
      await studySubjectService.remove(deletingSubjectId);
    } catch (error) {
      setSubjects(previousSubjects);
      setSubjectError(error.response?.data?.message || 'Failed to delete subject. Please try again.');
      console.error('Error deleting study subject:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handlers for in-focus materials access
  const handleOpenMaterials = async () => {
    setShowMaterialsModal(true);
    setMaterialsLoading(true);
    try {
      const response = await materialService.getMaterials();
      const materialsArray = Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []);
      setMaterials(materialsArray);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleCloseMaterials = () => {
    setShowMaterialsModal(false);
    setSelectedMaterial(null);
  };

  const handleOpenUploadModal = () => {
    setShowUploadModal(true);
    setUploadError('');
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadData({ title: '', content: '' });
    setUploadFile(null);
    setUploadError('');
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    
    if (!uploadData.title.trim()) {
      setUploadError('Please enter a title');
      return;
    }

    if (!uploadFile && !uploadData.content.trim()) {
      setUploadError('Please upload a file or enter content');
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('title', uploadData.title);
    if (uploadFile) {
      formData.append('file', uploadFile);
    } else {
      formData.append('content', uploadData.content);
    }

    try {
      await materialService.uploadMaterial(formData);
      handleCloseUploadModal();
      // Refresh materials list if it's open
      if (showMaterialsModal) {
        const response = await materialService.getMaterials();
        const materialsArray = Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []);
        setMaterials(materialsArray);
      }
    } catch (error) {
      console.error('Error uploading material:', error);
      setUploadError(error.response?.data?.message || 'Failed to upload material. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAskFocusAI = async (e) => {
    e.preventDefault();
    const trimmed = focusQuestion.trim();
    if (!trimmed || focusAskLoading) {
      return;
    }

    setFocusAskLoading(true);
    setFocusAskError('');
    try {
      const response = await qaService.askQuestion(null, trimmed, 'focus');
      setFocusAnswer(response?.data?.answer || 'No answer received.');
    } catch (error) {
      console.error('Error asking focus AI:', error);
      setFocusAskError(error.response?.data?.message || 'Unable to fetch focus answer.');
    } finally {
      setFocusAskLoading(false);
    }
  };

  // Calculate circular progress dashoffset
  const circleRadius = 54;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const progressPercentage = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const strokeDashoffset = circleCircumference - (progressPercentage / 100) * circleCircumference;

  const timerTitle = activeTimerType === 'focus' ? 'Focus Timer' : 'Normal Timer';
  const showFocusOverlay =
    isFullscreenFocus &&
    activeTimerType === 'focus' &&
    timerActive &&
    !!document.fullscreenElement;

  const focusOverlayMarkup = (
    <div className="focus-mode-fullscreen-overlay">
      <div className="focus-mode-content">
        <h1 className="focus-mode-title">Focus Mode Active</h1>
        <p className="focus-mode-subtitle">Stay focused on your study session</p>
        
        <div className="focus-mode-timer-large">
          <div className="focus-timer-circle-container">
            <svg className="focus-timer-svg" width="280" height="280" viewBox="0 0 240 240">
              <circle className="focus-timer-bg" cx="120" cy="120" r="108" />
              <circle
                className="focus-timer-progress"
                cx="120"
                cy="120"
                r="108"
                style={{
                  strokeDasharray: 2 * Math.PI * 108,
                  strokeDashoffset: progressPercentage > 0 ? (2 * Math.PI * 108) - (progressPercentage / 100) * (2 * Math.PI * 108) : 0,
                }}
              />
            </svg>
            <div className="focus-timer-display-inner">
              <span className="focus-countdown-display">{formatDigitalTime(remainingSeconds)}</span>
            </div>
          </div>
        </div>

        <div className="focus-mode-controls">
          <button className="btn btn-secondary btn-lg" onClick={handleTogglePause}>
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button className="btn btn-danger btn-lg" onClick={() => setShowExitConfirm(true)}>🚪 Exit Focus Mode</button>
        </div>

        <div className="focus-mode-material-access">
          <p className="focus-access-label">Quick Access</p>
          <div className="focus-material-buttons">
            <button className="btn btn-ghost btn-md" onClick={handleOpenMaterials}>
              📚 Read Existing Material
            </button>
            <button className="btn btn-ghost btn-md" onClick={handleOpenUploadModal}>
              📤 Upload New Material
            </button>
          </div>
        </div>

        <div className="focus-ask-ai-card">
          <h3>Ask AI (Focus Mode)</h3>
          <form onSubmit={handleAskFocusAI} className="focus-ask-ai-form">
            <textarea
              className="focus-ask-ai-textarea"
              value={focusQuestion}
              onChange={(e) => setFocusQuestion(e.target.value)}
              placeholder="Ask a quick study question..."
              rows={2}
              required
            />
            <button className="btn btn-primary btn-md" type="submit" disabled={focusAskLoading || !focusQuestion.trim()}>
              {focusAskLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </form>

          {focusAskError && <p className="focus-ask-ai-error">{focusAskError}</p>}

          {focusAnswer && (
            <div className="focus-ask-ai-response">
              <AiAnswerContent text={focusAnswer} className="focus-ai-answer-content" />
            </div>
          )}
        </div>

        {showTabWarning && (
          <div className="tab-warning-banner">
            ⚠️ Focus Mode is active. Please return to your study session.
          </div>
        )}

        {showExitConfirm && (
          <div className="focus-exit-modal-overlay">
            <div className="focus-exit-modal">
              <h3 className="modal-title">Leave Focus Mode?</h3>
              <p className="welcome-text">Are you sure you want to leave Focus Mode? Your timer will be stopped.</p>
              <div className="form-actions mt-4 justify-center">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={handleExitConfirmNo}
                >
                  Stay Focused
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={handleExitConfirmYes}
                >
                  Exit Focus Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {showMaterialsModal && !selectedMaterial && (
          <div className="focus-material-modal-overlay">
            <div className="focus-material-modal">
              <div className="focus-modal-header">
                <h3 className="modal-title">📚 Study Materials</h3>
                <button className="modal-close-btn" onClick={handleCloseMaterials}>✕</button>
              </div>
              
              <div className="focus-modal-content">
                {materialsLoading ? (
                  <div className="loading-state">Loading materials...</div>
                ) : materials.length === 0 ? (
                  <div className="empty-state">
                    <p>📖 No study materials found.</p>
                    <p className="text-muted">Upload your first material to get started.</p>
                  </div>
                ) : (
                  <div className="materials-grid">
                    {materials.map((material) => (
                      <div 
                        key={material.id} 
                        className="material-list-item"
                        onClick={() => setSelectedMaterial(material)}
                      >
                        <div className="material-item-header">
                          <h5>{material.title}</h5>
                          <span className="type-badge-sm">{material.fileType}</span>
                        </div>
                        {material.summary && (
                          <p className="material-preview">{material.summary.substring(0, 100)}...</p>
                        )}
                        <span className="view-link">View Details →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedMaterial && (
          <div className="focus-material-viewer">
            <div className="focus-material-header">
              <button className="focus-back-button" onClick={() => setSelectedMaterial(null)}>← Back to List</button>
              <div>
                <h3 className="focus-material-title">{selectedMaterial.title}</h3>
                <div className="focus-material-metadata">
                  <span className="type-badge">{selectedMaterial.fileType}</span>
                  <span className="date-text">{formatSafeDate(selectedMaterial.createdAt, 'Date unavailable')}</span>
                </div>
              </div>
            </div>

            <div className="focus-material-content-container">
              {selectedMaterial.summary && (
                <div className="material-section">
                  <h5>Summary</h5>
                  <p>{selectedMaterial.summary}</p>
                </div>
              )}
              
              {selectedMaterial.keyTopics && selectedMaterial.keyTopics.length > 0 && (
                <div className="material-section">
                  <h5>Key Topics</h5>
                  <div className="topics-list">
                    {selectedMaterial.keyTopics.map((topic, idx) => (
                      <span key={idx} className="topic-tag">{topic}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedMaterial.content && (
                <div className="material-section">
                  <h5>Content</h5>
                  <div className="material-content-text">{selectedMaterial.content}</div>
                </div>
              )}
            </div>

            <div className="focus-ask-ai-section">
              <textarea
                className="focus-material-ask-textarea"
                value={focusQuestion}
                onChange={(e) => setFocusQuestion(e.target.value)}
                placeholder="Ask about this material..."
                rows={1}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleAskFocusAI}
                disabled={focusAskLoading || !focusQuestion.trim()}
              >
                {focusAskLoading ? 'Thinking...' : 'Ask AI'}
              </button>
            </div>

            {focusAnswer && (
              <div className="focus-material-answer">
                <AiAnswerContent text={focusAnswer} className="focus-ai-answer-content" />
              </div>
            )}
          </div>
        )}

        {showUploadModal && (
          <div className="focus-material-modal-overlay">
            <div className="focus-material-modal focus-upload-modal">
              <div className="focus-modal-header focus-upload-title-section">
                <h3 className="modal-title">📤 Upload New Material</h3>
                <button className="modal-close-btn" onClick={handleCloseUploadModal}>✕</button>
              </div>
              
              <div className="focus-modal-content focus-upload-modal-content">
                <form onSubmit={handleUploadMaterial} className="upload-form focus-upload-form">
                  {uploadError && <div className="error-message">{uploadError}</div>}
                  
                  <div className="form-group">
                    <label htmlFor="focus-material-title">Material Title</label>
                    <input
                      type="text"
                      id="focus-material-title"
                      className="input-glass"
                      placeholder="Enter title"
                      value={uploadData.title}
                      onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="focus-file-input">Upload File (PDF/TXT/DOCX)</label>
                    <div className="file-input-wrapper">
                      <input
                        type="file"
                        id="focus-file-input"
                        className="file-hidden"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        accept=".pdf,.txt,.docx"
                      />
                      <label htmlFor="focus-file-input" className="file-box-compact">
                        <div className="file-icon-sm">📄</div>
                        {uploadFile ? <p className="file-name-display">{uploadFile.name}</p> : <p>Click to select file</p>}
                      </label>
                    </div>
                  </div>

                  {!uploadFile && (
                    <div className="form-group">
                      <label htmlFor="focus-paste-content">Or Paste Content</label>
                      <textarea
                        id="focus-paste-content"
                        className="input-glass"
                        placeholder="Paste your study notes here"
                        value={uploadData.content}
                        onChange={(e) => setUploadData({ ...uploadData, content: e.target.value })}
                        rows="6"
                      />
                    </div>
                  )}

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={uploadLoading}>
                      {uploadLoading ? 'Uploading...' : 'Upload Material'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleCloseUploadModal}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {showFocusOverlay && createPortal(focusOverlayMarkup, document.body)}

      <div className="study-dashboard-container">
        <h2 className="section-title-sm mb-4">Study Overview</h2>
        <div className="study-stats-grid">

        {activeTimerType ? (
          <div className="stat-card timer-card glass-card timer-screen-card">
            <div className="timer-screen-header">
              <h3>{timerTitle}</h3>
              <span className="timer-screen-subtitle">Dedicated Timer Screen</span>
            </div>

            <div className="timer-circle-container">
              <svg className="timer-svg" width="140" height="140" viewBox="0 0 120 120">
                <circle className="timer-bg" cx="60" cy="60" r={circleRadius} />
                <circle
                  className="timer-progress"
                  cx="60"
                  cy="60"
                  r={circleRadius}
                  style={{
                    strokeDasharray: circleCircumference,
                    strokeDashoffset: timerActive || remainingSeconds > 0 ? strokeDashoffset : 0,
                  }}
                />
              </svg>
              <div className="timer-display-inner">
                <span className="countdown-display digital-clock">{formatDigitalTime(remainingSeconds)}</span>
              </div>
            </div>

            <div className="timer-screen-controls">
              <button className="btn btn-secondary" onClick={handleTogglePause}>
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              {activeTimerType === 'focus' && !isFullscreenFocus && timerActive && (
                <button className="btn btn-primary" onClick={handleEnterFocusFullscreen}>Enter Focus Mode</button>
              )}
              <button className="btn btn-ghost" onClick={handleResetTimer}>Reset</button>
              <button className="btn btn-danger" onClick={handleStopTimer}>Stop</button>
            </div>
          </div>
        ) : (
          <>
            <div className="stat-card timer-card glass-card hover-lift">
              <h3>Normal Timer</h3>
              <p className="timer-note">Balanced revision session</p>
              <div className="digital-preview">{formatDigitalTime(Math.max(1, Number(normalMinutes || 0)) * 60)}</div>
              <div className="timer-layout-row">
                <label htmlFor="normal-timer-minutes">Minutes</label>
                <input
                  id="normal-timer-minutes"
                  type="number"
                  min="1"
                  className="input-glass timer-input"
                  value={normalMinutes}
                  onChange={(e) => setNormalMinutes(parseInt(e.target.value, 10) || 0)}
                />
                <button className="btn btn-primary" onClick={() => handleStartTimer('normal')}>Start</button>
              </div>
            </div>

            <div className="stat-card timer-card glass-card hover-lift">
              <h3>Focus Timer</h3>
              <p className="timer-note">Deep focus, distraction-free</p>
              <div className="digital-preview">{formatDigitalTime(Math.max(1, Number(focusMinutes || 0)) * 60)}</div>
              <div className="timer-layout-row">
                <label htmlFor="focus-timer-minutes">Minutes</label>
                <input
                  id="focus-timer-minutes"
                  type="number"
                  min="1"
                  className="input-glass timer-input"
                  value={focusMinutes}
                  onChange={(e) => setFocusMinutes(parseInt(e.target.value, 10) || 0)}
                />
                <button className="btn btn-primary" onClick={() => handleStartTimer('focus')}>Start</button>
              </div>
            </div>
          </>
        )}

        <div className="stat-card subject-card glass-card">
          <h3>Study Subjects</h3>
          <p className="timer-note">Add the subject you want to revise</p>

          <div className="subject-input-row">
            <input
              type="text"
              className="input-glass"
              placeholder="e.g. Data Structures"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubject();
                }
              }}
            />
            <button className="btn btn-primary" onClick={handleAddSubject} disabled={subjectLoading || !subjectInput.trim()}>
              {subjectLoading ? 'Adding...' : 'Add Subject'}
            </button>
          </div>

          <div className="subject-list">
            {subjectError && <p className="subject-error-msg">{subjectError}</p>}
            {subjects.length === 0 ? (
              <p className="text-muted">No subjects added yet.</p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="subject-item">
                  <span>{subject.title}</span>
                  <button
                    className="subject-delete-btn"
                    type="button"
                    aria-label={`Delete ${subject.title}`}
                    onClick={() => {
                      setSubjectError('');
                      setSubjectToDelete(subject);
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal show={completionModal.show} title="Session Finished" onClose={() => setCompletionModal({ show: false, message: '' })}>
        <div className="welcome-popup-content">
          <h2 className="welcome-title confetti-text">Session Complete!</h2>
          <p className="welcome-text">{completionModal.message}</p>

          <div className="form-actions mt-4 justify-center">
            <button className="btn btn-primary" onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCompletionModal({ show: false, message: '' });
            }}>Take a Break</button>
            <button className="btn btn-secondary" onClick={() => {
              if (activeTimerType) {
                const baseMinutes = activeTimerType === 'focus' ? focusMinutes : normalMinutes;
                const total = Math.max(1, Number(baseMinutes || 0)) * 60;
                setRemainingSeconds(total);
                setTotalSeconds(total);
                setTimerActive(true);
              }
              setCompletionModal({ show: false, message: '' });
            }}>Add More Time</button>
          </div>
        </div>
      </Modal>

      <Modal
        show={!!subjectToDelete}
        title="Confirm Delete"
        onClose={() => {
          if (!deleteLoading) {
            setSubjectToDelete(null);
          }
        }}
      >
        <div className="delete-confirm-content">
          <p className="welcome-text">Are you sure you want to delete this subject?</p>
          <div className="form-actions mt-4 justify-center">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setSubjectToDelete(null)}
              disabled={deleteLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              type="button"
              onClick={handleDeleteSubject}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
      </div>
    </>
  );
};

export default memo(StudyDashboard);
