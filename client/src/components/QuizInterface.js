import React, { useState, useEffect } from 'react';
import { quizService } from '../services/api';
import Modal from './Modal';
import '../styles/QuizInterface.css';

const QuizInterface = ({ quiz, onBack }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressOffset, setProgressOffset] = useState(0);

  const handleSelectAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = { answer };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await quizService.submitQuiz(quiz.id, answers);
      setResult(response.data);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Animate result circle offset
  useEffect(() => {
    if (submitted && result) {
      const p = result.percentage;
      const circleRadius = 80;
      const circleCircumference = 2 * Math.PI * circleRadius;
      const targetOffset = circleCircumference - (p / 100) * circleCircumference;

      // Delay animation slightly for better UX
      setTimeout(() => setProgressOffset(targetOffset), 100);
    }
  }, [submitted, result]);

  const getPerformanceData = () => {
    const p = result?.percentage || 0;
    if (p >= 90) {
      return {
        title: 'Outstanding!',
        message: 'You mastered this topic. Excellent work!',
        badge: 'badge-outstanding',
        tone: 'outstanding',
      };
    }
    if (p >= 70) {
      return {
        title: 'Great Job!',
        message: 'You have a strong understanding. Keep it up!',
        badge: 'badge-great',
        tone: 'great',
      };
    }
    if (p >= 50) {
      return {
        title: 'Needs Improvement',
        message: 'You are close. Review the material and try again.',
        badge: 'badge-improve',
        tone: 'improve',
      };
    }
    return {
      title: 'Keep Practicing',
      message: "Don't worry. Review the material and retry the quiz.",
      badge: 'badge-practice',
      tone: 'practice',
    };
  };

  const handleRetryQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setResult(null);
    setSubmitted(false);
    setProgressOffset(0);
  };

  if (submitted && result) {
    const circleRadius = 80;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const perfData = getPerformanceData();

    return (
      <Modal
        show={true}
        title="Quiz Completed"
        onClose={onBack}
        contentClassName="quiz-results-modal-shell"
        bodyClassName="quiz-results-modal-body"
      >
        <div className="results-modal-content">
          <div className="results-top-panel">
            <div className="results-score-circle">
              <svg className="results-svg" viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="55%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                <circle className="results-bg" cx="90" cy="90" r={circleRadius} />
                <circle
                  className="results-progress"
                  cx="90" cy="90" r={circleRadius}
                  style={{
                    strokeDasharray: circleCircumference,
                    strokeDashoffset: progressOffset || circleCircumference,
                    stroke: 'url(#scoreGradient)'
                  }}
                />
              </svg>
              <div className="results-inner-text">
                <span className="results-percentage">{result.percentage}%</span>
                <span className="results-fraction">{result.score} / {result.totalQuestions}</span>
              </div>
            </div>

            <div className="results-score-summary">
              <p className="score-summary-label">Overall Performance</p>
              <p className="score-summary-value">{result.score} correct out of {result.totalQuestions}</p>
              <p className="score-summary-sub">Review each answer below to learn faster.</p>
            </div>
          </div>

          <div className={`performance-badge ${perfData.badge}`}>
            {perfData.title}
          </div>

          <div className={`performance-message-card ${perfData.tone}`}>
            <h4>{perfData.title}</h4>
            <p>{perfData.message}</p>
          </div>

          <div className="answers-section">
            <div className="answers-section-header">
              <h4>Answer Review</h4>
              <span>{result.totalQuestions} Questions</span>
            </div>

            <div className="answers-review-premium">
              {result.results.questions.map((q, idx) => {
                const ansData = result.results.answers[idx];
                const isCorrect = ansData.isCorrect;
                return (
                  <div key={idx} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                    <div className="review-head">
                      <div className="review-question">{idx + 1}. {q.question}</div>
                      <span className={`review-chip ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div className="review-answer-box">
                      <p>Your answer: <span className={isCorrect ? 'text-correct' : 'text-incorrect'}>{ansData.userAnswer}</span></p>
                      {!isCorrect && (
                        <p>Correct answer: <span className="text-correct">{q.correctAnswer}</span></p>
                      )}
                    </div>

                    {!isCorrect && q.explanation && (
                      <div className="review-explanation">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="results-action-row">
            <button className="results-retry-btn" onClick={handleRetryQuiz}>Retry Quiz</button>
            <button className="results-back-btn" onClick={onBack}>Back to Material</button>
          </div>
        </div>
      </Modal>
    );
  }

  const question = quiz.questions[currentQuestion];
  const answered = answers[currentQuestion] !== undefined;
  const progressPercent = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="quiz-interface-container">
      <div className="quiz-header">
        <h2>Quiz In Progress</h2>
        <div className="progress">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </div>
        <div className="quiz-progress-bar-bg">
          <div className="quiz-progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div className="question-card-premium glass-card">
        <h3 className="question-text">{question.question}</h3>
        <div className="options-grid">
          {question.options.map((option, idx) => {
            const isSelected = answers[currentQuestion]?.answer === option;
            const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
            return (
              <div
                key={idx}
                className={`option-premium ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectAnswer(option)}
              >
                <span>{option}</span>
                <div className="option-icon">
                  {isSelected ? '✓' : optionLetters[idx]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="quiz-navigation">
        <button
          className="btn btn-secondary"
          onClick={handlePrev}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>
        {currentQuestion === quiz.questions.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!answered || isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!answered}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizInterface;
