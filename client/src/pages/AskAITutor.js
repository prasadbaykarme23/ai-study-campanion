import React, { useCallback, useState } from 'react';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import { qaService } from '../services/api';
import AiAnswerContent from '../components/AiAnswerContent';
import '../styles/AskAITutor.css';

const ASK_AI_CACHE_PREFIX = 'ask-ai-cache:';

const AskAITutor = () => {
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAskAI = useCallback(async (e) => {
    e.preventDefault();

    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion || isLoading) {
      return;
    }

    const cacheKey = `${ASK_AI_CACHE_PREFIX}${trimmedQuestion.toLowerCase()}`;
    const cachedAnswer = localStorage.getItem(cacheKey);
    if (cachedAnswer) {
      setAnswerText(cachedAnswer);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await qaService.askQuestion(null, trimmedQuestion, 'general');
      const nextAnswer = response?.data?.answer || 'No answer received.';
      setAnswerText(nextAnswer);
      localStorage.setItem(cacheKey, nextAnswer);
    } catch (requestError) {
      console.error('Error asking AI tutor:', requestError);
      setError(requestError.response?.data?.message || 'Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, questionText]);

  return (
    <AuthenticatedPageLayout>
      <div className="ask-ai-page-container">
        <section className="ask-ai-section glass-card animate-fade-in">
          <div className="ask-ai-header">
            <h2 className="section-title-sm">Ask AI Tutor</h2>
            <p className="text-muted">Ask any study topic and get clear key points, examples, and a YouTube learning link.</p>
          </div>

          <form className="ask-ai-form" onSubmit={handleAskAI}>
            <textarea
              className="ask-ai-textarea"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Example: Explain photosynthesis in simple terms"
              rows={4}
              required
            />
            <div className="ask-ai-actions">
              <button type="submit" className="btn btn-primary" disabled={isLoading || !questionText.trim()}>
                {isLoading ? 'Thinking...' : 'Ask AI'}
              </button>
            </div>
          </form>

          {error && <p className="ask-ai-error">{error}</p>}

          {answerText && (
            <div className="ask-ai-response">
              <AiAnswerContent text={answerText} className="ask-ai-answer-content" />
            </div>
          )}
        </section>
      </div>
    </AuthenticatedPageLayout>
  );
};

export default AskAITutor;
