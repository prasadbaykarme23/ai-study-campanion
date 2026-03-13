import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialService, quizService, flashcardService } from '../services/api';
import { useMaterialStore, useAuthStore, useFocusModeStore } from '../context/store';
import MaterialCard from '../components/MaterialCard';
import StudyDashboard from '../components/StudyDashboard';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import '../styles/Dashboard.css';

const DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;

const getDashboardCacheKey = (userId) => `dashboard-cache:${userId}`;

const parseCount = (data) => (
  Array.isArray(data) ? data.length : (Array.isArray(data?.data) ? data.data.length : 0)
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { materials, isLoading: materialsLoading, setMaterials, setLoading } = useMaterialStore();
  const { user } = useAuthStore();
  const { isFocusModeActive } = useFocusModeStore();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({ title: '', content: '' });
  const [file, setFile] = useState(null);
  const [streak, setStreak] = useState(1);
  const [quizCount, setQuizCount] = useState(0);
  const [flashcardCount, setFlashcardCount] = useState(0);

  const fetchDashboardData = useCallback(async ({ force = false } = {}) => {
    if (!user?.id) {
      setMaterials([]);
      setQuizCount(0);
      setFlashcardCount(0);
      setLoading(false);
      return;
    }

    const cacheKey = getDashboardCacheKey(user.id);
    if (!force) {
      try {
        const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
        if (cached && (Date.now() - cached.timestamp) < DASHBOARD_CACHE_TTL_MS) {
          setMaterials(Array.isArray(cached.materials) ? cached.materials : []);
          setQuizCount(Number(cached.quizCount) || 0);
          setFlashcardCount(Number(cached.flashcardCount) || 0);
          setLoading(false);
          return;
        }
      } catch (error) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    setLoading(true);
    try {
      const [materialsResult, quizzesResult, flashcardsResult] = await Promise.allSettled([
        materialService.getMaterials(),
        quizService.getResults(),
        flashcardService.list(),
      ]);

      const materialsArray = materialsResult.status === 'fulfilled'
        ? (Array.isArray(materialsResult.value.data)
          ? materialsResult.value.data
          : (Array.isArray(materialsResult.value.data?.data) ? materialsResult.value.data.data : []))
        : [];

      const nextQuizCount = quizzesResult.status === 'fulfilled'
        ? parseCount(quizzesResult.value?.data)
        : 0;

      const nextFlashcardCount = flashcardsResult.status === 'fulfilled'
        ? parseCount(flashcardsResult.value?.data)
        : 0;

      setMaterials(materialsArray);
      setQuizCount(nextQuizCount);
      setFlashcardCount(nextFlashcardCount);

      sessionStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        materials: materialsArray,
        quizCount: nextQuizCount,
        flashcardCount: nextFlashcardCount,
      }));
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
      setQuizCount(0);
      setFlashcardCount(0);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMaterials, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    } else {
      setMaterials([]);
      setQuizCount(0);
      setFlashcardCount(0);
    }
  }, [fetchDashboardData, setMaterials, user?.id]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastVisit = localStorage.getItem('lastVisitDate');
    let curr = parseInt(localStorage.getItem('studyStreak') || '0', 10);
    if (!lastVisit) {
      curr = 1;
    } else if (lastVisit !== today) {
      const prev = new Date();
      prev.setDate(prev.getDate() - 1);
      curr = lastVisit === prev.toISOString().slice(0, 10) ? curr + 1 : 1;
    }
    localStorage.setItem('lastVisitDate', today);
    localStorage.setItem('studyStreak', String(curr));
    setStreak(curr);
  }, []);

  const handleUpload = useCallback(async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', uploadData.title);
    if (file) formData.append('file', file);
    else formData.append('content', uploadData.content);

    try {
      await materialService.uploadMaterial(formData);
      setUploadData({ title: '', content: '' });
      setFile(null);
      setShowUploadForm(false);
      if (user?.id) {
        sessionStorage.removeItem(getDashboardCacheKey(user.id));
      }
      fetchDashboardData({ force: true });
    } catch (error) {
      console.error('Error uploading material:', error);
    }
  }, [fetchDashboardData, file, uploadData.content, uploadData.title, user?.id]);

  const progressPct = useMemo(() => Math.round(
    (Math.min(materials.length, 12) / 12) * 40 +
    (Math.min(quizCount, 8) / 8) * 40 +
    (Math.min(flashcardCount, 25) / 25) * 20
  ), [flashcardCount, materials.length, quizCount]);

  const quickActions = useMemo(() => [
    { 
      title: 'Upload Material', 
      icon: '📤', 
      action: () => { 
        if (isFocusModeActive) {
          alert('⏱️ Focus Mode is active. Exit focus mode before uploading materials.');
          return;
        }
        setShowUploadForm(true); 
        document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 
      gradient: 'var(--primary-gradient)' 
    },
    { 
      title: 'Auto Quizzes', 
      icon: '📝', 
      action: () => { 
        if (isFocusModeActive) {
          alert('⏱️ Focus Mode is active. Exit focus mode before navigating.');
          return;
        }
        navigate('/questions'); 
      }, 
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
    },
    { 
      title: 'Flashcards', 
      icon: '🗂️', 
      action: () => { 
        if (isFocusModeActive) {
          alert('⏱️ Focus Mode is active. Exit focus mode before navigating.');
          return;
        }
        navigate('/flashcards'); 
      }, 
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
    },
    { 
      title: 'AI Compiler', 
      icon: '💻', 
      action: () => { 
        if (isFocusModeActive) {
          alert('⏱️ Focus Mode is active. Exit focus mode before navigating.');
          return;
        }
        navigate('/compiler'); 
      }, 
      gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
    }
  ], [isFocusModeActive, navigate]);

  return (
    <AuthenticatedPageLayout>
      <div className="dashboard-container">

      <main className="dashboard-main-content">
        <section className="dashboard-hero animate-fade-in">
          <div className="hero-top-row">
            <div className="hero-text-content">
              <h1 className="hero-greeting">Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0] || 'Student'}</span> 👋</h1>
              <p className="hero-subtext">Ready to conquer your goals today? Let's dive into your learning session.</p>
            </div>
            <div className="hero-resume-area">
              <p className="resume-label">Continue where you left off</p>
              <button
                className={`btn btn-primary resume-btn ${isFocusModeActive ? 'disabled' : ''}`}
                onClick={() => {
                  if (isFocusModeActive) {
                    alert('⏱️ Focus Mode is active. Exit focus mode before navigating.');
                    return;
                  }
                  navigate('/summary');
                }}
              >
                ▶ Resume Study
              </button>
            </div>
          </div>

          <div className="hero-stats-grid">
            {[
              { icon: '🔥', value: `${streak} day${streak !== 1 ? 's' : ''}`, label: 'Study Streak' },
              { icon: '📚', value: materials.length, label: 'Materials Uploaded' },
              { icon: '📝', value: quizCount, label: 'Quizzes Completed' },
              { icon: '🧠', value: flashcardCount, label: 'Flashcards Created' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="hero-stat-card glass-card">
                <span className="stat-icon">{icon}</span>
                <div className="stat-info">
                  <span className="stat-value">{value}</span>
                  <span className="stat-label">{label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-bottom-row">
            <div className="daily-tip-banner glass-card">
              💡 <span>Study Tip: Reviewing your notes within 24 hours improves retention by 60%.</span>
            </div>
            <div className="hero-progress glass-card">
              <div className="progress-header">
                <span className="progress-label">Weekly Learning Progress</span>
                <span className="progress-pct text-gradient">{progressPct}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="features-overview-section animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <h2 className="section-title-sm">Platform Features</h2>
          <div className="features-cards-grid">
            {[
              { icon: '💬', title: 'AI Q&A Tutor',            desc: 'Real-time answers to homework and study questions with detailed explanations' },
              { icon: '📄', title: 'Smart Notes & Summaries', desc: 'Turn PDF and document uploads into organized study notes' },
              { icon: '🔄', title: 'Flashcards & Practice',   desc: 'Generate quizzes and flashcards for better retention' },
              { icon: '📊', title: 'Study Tracker',           desc: 'Monitor your progress and view learning analytics' },
              { icon: '🎧', title: 'Text-to-Speech',          desc: 'Listen to notes and summaries for better learning' },
              { icon: '⚡', title: 'Instant Results',         desc: 'Get AI generated study materials instantly' },
            ].map((f, i) => (
              <div key={i} className="feature-overview-card glass-card">
                <span className="foc-icon">{f.icon}</span>
                <h3 className="foc-title">{f.title}</h3>
                <p className="foc-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="quick-actions-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="section-title-sm">Quick Actions</h2>
          <div className="quick-actions-grid">
            {quickActions.map((action, idx) => (
              <div
                key={idx}
                className={`action-card glass-card hover-lift ${isFocusModeActive ? 'disabled' : ''}`}
                onClick={action.action}
              >
                <div className="action-icon-wrapper" style={{ background: action.gradient }}>
                  {action.icon}
                </div>
                <h3>{action.title}</h3>
                <span className="action-arrow">→</span>
              </div>
            ))}
          </div>
        </section>

        <section className="study-stats-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <StudyDashboard />
        </section>

        <section id="upload-section" className="materials-section animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="materials-header">
            <div>
              <h2 className="section-title-sm">Your Study Materials</h2>
              <p className="text-muted">Manage your organized learning resources</p>
            </div>
            {!showUploadForm && (
              <button 
                className={`btn btn-primary btn-upload ${isFocusModeActive ? 'disabled' : ''}`} 
                onClick={() => {
                  if (isFocusModeActive) {
                    alert('⏱️ Focus Mode is active. Exit focus mode before uploading materials.');
                    return;
                  }
                  setShowUploadForm(true);
                }}
              >
                + New Material
              </button>
            )}
          </div>

          {showUploadForm && (
            <div className="upload-form-card glass-card">
              <h3>Upload New Material</h3>
              <form onSubmit={handleUpload} className="upload-form">
                <div className="form-group">
                  <input
                    type="text"
                    id="materialTitle"
                    placeholder=" "
                    value={uploadData.title}
                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                    required
                  />
                  <label htmlFor="materialTitle">Material Title</label>
                </div>

                <div className="upload-file-area">
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="fileInput"
                      className="file-hidden"
                      onChange={(e) => setFile(e.target.files[0])}
                      accept=".pdf,.txt,.docx"
                    />
                    <label htmlFor="fileInput" className="file-box">
                      <div className="file-icon">📄</div>
                      {file ? <p className="file-name-display">{file.name}</p> : <p>Drag & Drop or Click to Upload (PDF/TXT/DOCX)</p>}
                    </label>
                  </div>
                </div>

                {!file && (
                  <div className="form-group mt-4">
                    <textarea
                      id="pasteContent"
                      placeholder=" "
                      value={uploadData.content}
                      onChange={(e) => setUploadData({ ...uploadData, content: e.target.value })}
                      rows="4"
                    />
                    <label htmlFor="pasteContent">Or paste text content directly</label>
                  </div>
                )}

                <div className="form-actions mt-4">
                  <button type="submit" className="btn btn-primary">Upload to AI Platform</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowUploadForm(false); setFile(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="materials-grid-wrapper mt-4">
            {materialsLoading ? (
              <div className="materials-grid materials-grid-skeleton">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="material-card-skeleton glass-card" aria-hidden="true">
                    <div className="skeleton-line title" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                    <div className="skeleton-chip-row">
                      <span className="skeleton-chip" />
                      <span className="skeleton-chip" />
                      <span className="skeleton-chip" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (!materials || materials.length === 0) ? (
              <div className="empty-materials-state glass-card">
                <div className="empty-icon-bg">📚</div>
                <h3>No Study Materials Found</h3>
                <p className="text-muted">You haven't uploaded anything yet. Start by uploading a PDF or pasting some text notes to let our AI process it.</p>
                <button 
                  className={`btn btn-primary mt-4 ${isFocusModeActive ? 'disabled' : ''}`} 
                  onClick={() => {
                    if (isFocusModeActive) {
                      alert('⏱️ Focus Mode is active. Exit focus mode before uploading materials.');
                      return;
                    }
                    setShowUploadForm(true);
                  }}
                >
                  Upload First Material
                </button>
              </div>
            ) : (
              <div className="materials-grid">
                {(materials || []).map((material) => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      </div>
    </AuthenticatedPageLayout>
  );
};

export default Dashboard;
