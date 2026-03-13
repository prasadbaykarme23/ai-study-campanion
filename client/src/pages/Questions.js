import React, { useState, useEffect } from 'react';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import { questionService } from '../services/api';
import '../styles/Questions.css';

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await questionService.list();
      setQuestions(res.data);
    } catch (err) {
      console.error('Error fetching questions', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    try {
      const res = await questionService.add(newQuestion);
      setQuestions([res.data.question, ...questions]);
      setNewQuestion('');
    } catch (err) {
      console.error('Error adding question', err);
      setError('Could not save question');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await questionService.remove(id);
      setQuestions(questions.filter((q) => q.id !== id));
    } catch (err) {
      console.error('Error deleting question', err);
      setError('Could not delete');
    }
  };

  return (
    <AuthenticatedPageLayout>
      <div className="questions-page-container">

      <div className="questions-header">
        <h2>Your Questions</h2>
        <p className="text-muted">Save difficult questions for later review and practice.</p>
      </div>

      <div className="question-form-card glass-card">
        <h3>Ask a New Question</h3>
        <form onSubmit={handleAdd} className="question-form">
          <textarea
            className="question-textarea"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="What would you like to ask or save for later?"
            required
            rows={3}
          />
          <button className="btn btn-primary" disabled={!newQuestion.trim()}>Save Question</button>
        </form>
        {error && <p className="text-incorrect mt-4">{error}</p>}
      </div>

      <div className="questions-list-section">
        <h3 className="section-title-sm">Saved Questions</h3>

        {loading && <p className="text-muted">Loading your questions...</p>}
        {questions.length === 0 && !loading && (
          <div className="empty-questions-state glass-card">
            <div className="empty-questions-icon">❓</div>
            <h3>No questions asked yet.</h3>
            <p className="text-muted">Ask something using the form above.</p>
          </div>
        )}

        <div className="questions-list">
          {questions.map((q) => (
            <div key={q.id} className="question-item-card">
              <div style={{ flex: 1 }}>
                <p className="question-item-text">{q.text}</p>
                {q.createdAt && (
                  <p className="question-item-timestamp">
                    {new Date(q.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                className="btn btn-ghost text-incorrect"
                onClick={() => handleDelete(q.id)}
                title="Delete Question"
                style={{ padding: '0.5rem', minWidth: '40px' }}
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      </div>
      </div>
    </AuthenticatedPageLayout>
  );
};

export default Questions;
