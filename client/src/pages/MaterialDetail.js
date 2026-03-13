import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { materialService, quizService, qaService } from '../services/api';
import QuizInterface from '../components/QuizInterface';
import { formatSafeDate } from '../utils/dateFormatter';
import { useSpeechSynthesis } from 'react-speech-kit';
import { FaPlay, FaPause, FaStop, FaVolumeUp } from 'react-icons/fa';
import '../styles/MaterialDetail.css';

const BROWSER_VOICE_PROFILES = {
  'Male':           ['male', 'microsoft david', 'microsoft mark', 'alex', 'daniel', 'fred', 'google uk english male'],
  'Female':         ['female', 'microsoft zira', 'samantha', 'karen', 'moira', 'victoria', 'google uk english female'],
  'Natural':        ['natural', 'enhanced', 'premium'],
  'System Default': [],
};

function matchBrowserVoice(profileName, voices) {
  if (!voices || voices.length === 0) return null;
  const keywords = BROWSER_VOICE_PROFILES[profileName] || [];
  for (const kw of keywords) {
    const hit = voices.find(v =>
      v.name.toLowerCase().includes(kw.toLowerCase()) ||
      v.lang.toLowerCase().includes(kw.toLowerCase())
    );
    if (hit) return hit;
  }
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

const MaterialDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showQAForm, setShowQAForm] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [question, setQuestion] = useState('');
  const [qaAnswer, setQAAnswer] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // Voice playback
  const { speak, cancel, speaking } = useSpeechSynthesis();
  const [selectedVoice, setSelectedVoice] = useState('Female');
  const [activeSection, setActiveSection] = useState(null);
  const [isPaused, setIsPaused]   = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const summaryRef = useRef(null);
  const contentRef = useRef(null);

  const fetchMaterial = useCallback(async () => {
    try {
      const response = await materialService.getMaterialById(id);
      setMaterial(response.data);
    } catch (error) {
      console.error('Error fetching material:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMaterial();
  }, [fetchMaterial]);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setAvailableVoices(window.speechSynthesis.getVoices() || []);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!speaking && !isPaused) setActiveSection(null);
  }, [speaking, isPaused]);

  const buildSpeakOpts = useCallback((text) => {
    const opts = { text, pitch: 1, rate: 1 };
    const matched = matchBrowserVoice(selectedVoice, availableVoices);
    if (matched) opts.voice = matched;
    return opts;
  }, [selectedVoice, availableVoices]);

  const startReading = useCallback((section, text) => {
    if (!text) return;
    cancel();
    setIsPaused(false);
    setActiveSection(section);
    setTimeout(() => {
      if (section === 'summary') {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (section === 'content') {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
    speak(buildSpeakOpts(text));
  }, [cancel, speak, buildSpeakOpts]);

  const handleReadSummary = useCallback(() => {
    startReading('summary', material?.summary);
  }, [material, startReading]);

  const handleReadContent = useCallback(() => {
    startReading('content', material?.content);
  }, [material, startReading]);

  const handleReadAll = useCallback(() => {
    if (!material) return;
    const combined = [material.summary, material.content].filter(Boolean).join('\n\n');
    startReading('summary', combined);
  }, [material, startReading]);

  const handlePause = () => {
    if (window.speechSynthesis) { window.speechSynthesis.pause(); setIsPaused(true); }
  };

  const handleResume = () => {
    if (window.speechSynthesis) { window.speechSynthesis.resume(); setIsPaused(false); }
  };

  const handleStop = useCallback(() => {
    cancel();
    setIsPaused(false);
    setActiveSection(null);
  }, [cancel]);

  const SectionVoicePlayer = ({ label }) => (
    <div className="section-voice-player">
      <div className="svp-left">
        <FaVolumeUp className="svp-icon" />
        <span className="svp-label">
          {isPaused ? 'Paused' : 'Reading'}: <strong>{label}</strong>
        </span>
      </div>
      <div className="svp-center">
        <select
          className="svp-voice-select"
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
        >
          <option>Male</option>
          <option>Female</option>
          <option>Natural</option>
          <option>System Default</option>
        </select>
      </div>
      <div className="svp-controls">
        {isPaused ? (
          <button className="svp-btn play" onClick={handleResume} title="Resume">
            <FaPlay /> Resume
          </button>
        ) : (
          <button className="svp-btn pause" onClick={handlePause} title="Pause" disabled={!speaking}>
            <FaPause /> Pause
          </button>
        )}
        <button className="svp-btn stop" onClick={handleStop} title="Stop">
          <FaStop /> Stop
        </button>
      </div>
    </div>
  );

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      console.log('[QUIZ] Creating quiz with:', { materialId: id, difficulty });
      const response = await quizService.createQuiz(id, difficulty);
      setActiveQuiz(response.data.quiz);
      setShowQuizForm(false);
    } catch (error) {
      console.error('Error creating quiz:', error);
      const errorMsg = error.response?.data?.message || error.message;
      if (errorMsg.includes('quota') || errorMsg.includes('429')) {
        alert('⚠️ OpenAI API quota exceeded.\n\nPlease:\n1. Check your OpenAI account credits\n2. Update OPENAI_API_KEY in .env with valid key\n3. Restart the backend server\n\nFor testing without credits, use the demo mode (coming soon).');
      } else {
        alert('Error creating quiz: ' + errorMsg);
      }
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    try {
      console.log('[QA] Asking question with:', { materialId: id, question });
      const response = await qaService.askQuestion(id, question, 'material');
      setQAAnswer(response.data.answer);
      setQuestion('');
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMsg = error.response?.data?.message || error.message;
      if (errorMsg.includes('quota') || errorMsg.includes('429')) {
        alert('⚠️ OpenAI API quota exceeded.\n\nPlease:\n1. Check your OpenAI account credits\n2. Update OPENAI_API_KEY in .env with valid key\n3. Restart the backend server\n\nFor testing without credits, use the demo mode (coming soon).');
      } else {
        alert('Error: ' + errorMsg);
      }
    }
  };

  const handleDeleteMaterial = async () => {
    const confirm = window.confirm(
      `Are you sure you want to delete "${material.title}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirm) return;

    setIsDeleting(true);
    try {
      console.log('[DELETE] Deleting material:', id);
      await materialService.deleteMaterial(id);
      console.log('[DELETE] ✅ Material deleted successfully');
      alert('✅ Material deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting material:', error);
      const errorMsg = error.response?.data?.message || error.message;
      alert('Error deleting material: ' + errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="loading">Loading material...</div>;
  if (!material) return <div className="error">Material not found</div>;

  if (activeQuiz) {
    return <QuizInterface quiz={activeQuiz} onBack={() => setActiveQuiz(null)} />;
  }

  return (
    <AuthenticatedPageLayout>
      <div className="material-detail">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>

        <div className="material-header">
          <h1>{material.title}</h1>
          <div className="material-meta">
            <span className="date">
              {formatSafeDate(material.createdAt, 'Date unavailable')}
            </span>
          </div>
        </div>

        {material.summary && (
          <div
            ref={summaryRef}
            className={`summary-section${activeSection === 'summary' ? ' section-active' : ''}`}
          >
            <div className="section-title-row">
              <h2>AI Summary</h2>
              <button
                className="voice-read-btn"
                onClick={handleReadSummary}
                disabled={!material.summary}
                title="Read summary aloud"
              >
                <FaVolumeUp /> Read Summary
              </button>
            </div>
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  a: ({ node, children, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
                }}
              >
                {material.summary}
              </ReactMarkdown>
            </div>
            {activeSection === 'summary' && (speaking || isPaused) && (
              <SectionVoicePlayer label="AI Summary" />
            )}
          </div>
        )}

        {material.keyTopics && material.keyTopics.length > 0 && (
          <div className="topics-section">
            <h2>Key Topics</h2>
            <div className="topics-list">
              {material.keyTopics.map((topic, idx) => (
                <span key={idx} className="topic-tag">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          ref={contentRef}
          className={`content-section${activeSection === 'content' ? ' section-active' : ''}`}
        >
          <div className="content-header">
            <h2>Content</h2>
            <div className="content-header-actions">
              <button
                className="voice-read-btn"
                onClick={handleReadContent}
                disabled={!material.content}
                title="Read content aloud"
              >
                <FaVolumeUp /> Read Content
              </button>
              <button
                className={`btn-expand ${showFullContent ? 'expanded' : ''}`}
                onClick={() => setShowFullContent(!showFullContent)}
                title={showFullContent ? 'Hide full content' : 'Show full content'}
              >
                {showFullContent ? '▼ Hide' : '▶ Expand'}
              </button>
            </div>
          </div>
          <div className={`content-display ${showFullContent ? 'full' : 'preview'}`}>
            {showFullContent ? (
              <div className="content-full markdown-content">
                <ReactMarkdown
                  components={{
                    a: ({ node, children, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                  }}
                >
                  {material.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="content-preview markdown-content">
                <ReactMarkdown
                  components={{
                    a: ({ node, children, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                  }}
                >
                  {material.content.substring(0, 500) + '...'}
                </ReactMarkdown>
              </div>
            )}
          </div>
          {activeSection === 'content' && (speaking || isPaused) && (
            <SectionVoicePlayer label="Content" />
          )}
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={() => setShowQuizForm(true)}>
            Generate Quiz
          </button>
          <button className="btn-secondary" onClick={() => setShowQAForm(true)}>
            Ask Question
          </button>
          <button className="btn-secondary" onClick={handleReadAll} title="Read summary then content">
            <FaPlay style={{ marginRight: 6 }} /> Read All
          </button>
          <button
            className="btn-danger"
            onClick={handleDeleteMaterial}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Material'}
          </button>
        </div>

        {showQuizForm && (
          <div className="form-modal">
            <form onSubmit={handleCreateQuiz}>
              <h3>Create Quiz</h3>
              <div className="form-group">
                <label>Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Create Quiz
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowQuizForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {showQAForm && (
          <div className="form-modal">
            <form onSubmit={handleAskQuestion}>
              <h3>Ask a Question</h3>
              <div className="form-group">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask anything about this material..."
                  required
                  rows="4"
                />
              </div>
              <button type="submit" className="btn-primary">
                Ask
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowQAForm(false)}
              >
                Cancel
              </button>
            </form>
            {qaAnswer && (
              <div className="qa-answer">
                <h4>Answer:</h4>
                <div className="markdown-content">
                  <ReactMarkdown
                    components={{
                      a: ({ node, children, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                      ),
                    }}
                  >
                    {qaAnswer}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthenticatedPageLayout>
  );
};

export default MaterialDetail;
