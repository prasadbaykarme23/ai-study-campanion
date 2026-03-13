import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import { flashcardService } from '../services/api';
import '../styles/Flashcards.css';

const Flashcards = () => {
  const [cards, setCards] = useState([]);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState({});
  const cardsRef = useRef(null);

  const [reviewedCount] = useState(() => parseInt(localStorage.getItem('flashcardsReviewed')) || 0);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await flashcardService.list();
      setCards(res.data);
    } catch (err) {
      console.error('Error fetching flashcards', err);
      setError('Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
    // Smooth scroll to cards section if navigated from dashboard
    setTimeout(() => {
      if (cardsRef.current) {
        cardsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    try {
      const res = await flashcardService.create(front, back);
      setCards([res.data.flashcard, ...cards]);
      setFront('');
      setBack('');
    } catch (err) {
      console.error('Error adding flashcard', err);
      setError('Could not save flashcard');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this flashcard?')) return;
    try {
      await flashcardService.remove(id);
      setCards(cards.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting flashcard', err);
      setError('Could not delete');
    }
  };

  const toggleFlip = (id) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AuthenticatedPageLayout>
      <div className="flashcards-page-container">

      <div className="flashcards-header">
        <h2>Study Flashcards</h2>
        <p className="text-muted">Create 3D flip cards to quickly memorize key concepts.</p>
        {reviewedCount > 0 && (
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            You have reviewed <strong>{reviewedCount}</strong> flashcard{reviewedCount === 1 ? '' : 's'} so far.
          </p>
        )}
      </div>

      <div className="flashcard-form-card glass-card">
        <h3>Create New Flashcard</h3>
        <form onSubmit={handleAdd} className="flashcard-form">
          <div className="form-group-flex">
            <label>Front Side (Question / Concept)</label>
            <input
              type="text"
              className="flashcard-input"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="e.g. What is the powerhouse of the cell?"
              required
            />
          </div>
          <div className="form-group-flex">
            <label>Back Side (Answer)</label>
            <input
              type="text"
              className="flashcard-input"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="e.g. Mitochondria"
              required
            />
          </div>
          <button className="btn btn-primary" disabled={!front.trim() || !back.trim()}>
            + Add Card
          </button>
        </form>
        {error && <p className="text-incorrect mt-4">{error}</p>}
      </div>

      <div className="cards-section" ref={cardsRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="section-title-sm" style={{ margin: 0 }}>Your Flashcard Deck</h3>
          {loading && <span className="text-muted">Loading deck...</span>}
        </div>

        <div className="cards-container">
          {cards.length === 0 && !loading && (
            <div className="empty-flashcards-state glass-card">
              <div className="empty-flashcards-icon">🗂️</div>
              <h3>No flashcards available</h3>
              <p className="text-muted">No flashcards available. Please create one.</p>
            </div>
          )}

          {cards.map((c) => (
            <div
              key={c.id}
              className={`flashcard-3d ${flipped[c.id] ? 'flipped' : ''}`}
              onClick={() => toggleFlip(c.id)}
            >
              <div className="flashcard-inner">
                <div className="flashcard-front">
                  <span className="flashcard-label">Front</span>
                  <p className="flashcard-text">{c.front}</p>
                  <button className="delete-btn-corner" onClick={(e) => handleDelete(c.id, e)} title="Delete Card">✖</button>
                </div>
                <div className="flashcard-back">
                  <span className="flashcard-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Back</span>
                  <p className="flashcard-text">{c.back}</p>
                  <button className="delete-btn-corner" onClick={(e) => handleDelete(c.id, e)} title="Delete Card">✖</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </AuthenticatedPageLayout>
  );
};

export default Flashcards;
