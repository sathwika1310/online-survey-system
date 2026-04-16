import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { surveyAPI, responseAPI } from '../utils/api';
import './PublicSurvey.css';

export default function PublicSurvey() {
  const { token } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const startTime = useRef(Date.now());
  const sessionId = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await surveyAPI.getByToken(token);
        setSurvey(data.survey);
        // Initialize answers
        const init = {};
        data.survey.questions.forEach(q => { init[q.id] = q.type === 'checkbox' ? [] : ''; });
        setAnswers(init);
      } catch (err) {
        setError(err.response?.data?.message || 'Survey not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const setAnswer = (qId, value) => setAnswers(prev => ({ ...prev, [qId]: value }));

  const toggleCheckbox = (qId, option) => {
    const curr = answers[qId] || [];
    if (curr.includes(option)) {
      setAnswer(qId, curr.filter(v => v !== option));
    } else {
      setAnswer(qId, [...curr, option]);
    }
  };

  const validate = () => {
    for (const q of survey.questions) {
      if (q.required) {
        const ans = answers[q.id];
        if (!ans || (Array.isArray(ans) && ans.length === 0)) {
          return `"${q.question}" is required`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    setSubmitting(true);
    try {
      const formattedAnswers = survey.questions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        questionType: q.type,
        value: answers[q.id],
      }));

      await responseAPI.submit({
        surveyId: survey._id,
        answers: formattedAnswers,
        respondentName: name || 'Anonymous',
        respondentEmail: email,
        timeTaken: Math.round((Date.now() - startTime.current) / 1000),
        sessionId: sessionId.current,
      });

      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="public-loading">
      <div className="public-spinner" />
      <p>Loading survey...</p>
    </div>
  );

  if (error) return (
    <div className="public-error">
      <div className="error-icon">◈</div>
      <h2>{error}</h2>
      <p>This survey may be inactive, expired, or doesn't exist.</p>
    </div>
  );

  if (submitted) return (
    <div className="public-success">
      <div className="success-icon">✓</div>
      <h2>Thank You!</h2>
      <p>Your response has been recorded. We appreciate your time!</p>
      <div className="success-confetti">🎉</div>
    </div>
  );

  const q = survey.questions[currentQ];
  const totalQ = survey.questions.length;
  const progress = ((currentQ) / totalQ) * 100;

  const canNext = () => {
    if (!q.required) return true;
    const ans = answers[q.id];
    return ans && (Array.isArray(ans) ? ans.length > 0 : String(ans).trim() !== '');
  };

  return (
    <div className="public-survey">
      <div className="survey-shell">
        {/* Header */}
        <div className="survey-header">
          <div className="survey-branding">
            <span className="brand-icon">◈</span> SurveyOS
          </div>
          <div className="survey-meta">
            <span className="badge badge-blue">~{survey.estimatedTime} min</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalQ} questions</span>
          </div>
        </div>

        <div className="survey-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">{currentQ} of {totalQ}</span>
        </div>

        {/* Respondent info (first question only) */}
        {currentQ === 0 && survey.allowAnonymous && (
          <div className="respondent-info">
            <h1 className="survey-title-big">{survey.title}</h1>
            {survey.description && <p className="survey-desc">{survey.description}</p>}
            <div className="info-grid">
              <div className="form-group">
                <label className="form-label">Your Name (optional)</label>
                <input type="text" className="form-input" placeholder="Anonymous" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Question card */}
        <div className="question-card">
          <div className="q-number">Question {currentQ + 1} of {totalQ}</div>
          <h2 className="q-text">
            {q.question}
            {q.required && <span className="q-required">*</span>}
          </h2>

          {/* MCQ */}
          {q.type === 'mcq' && (
            <div className="options-group">
              {(q.options || []).map((opt, i) => (
                <label key={i} className={`option-card ${answers[q.id] === opt ? 'selected' : ''}`}>
                  <input type="radio" name={q.id} value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)} />
                  <span className="radio-circle" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Checkbox */}
          {q.type === 'checkbox' && (
            <div className="options-group">
              {(q.options || []).map((opt, i) => (
                <label key={i} className={`option-card ${(answers[q.id] || []).includes(opt) ? 'selected' : ''}`}>
                  <input type="checkbox" value={opt}
                    checked={(answers[q.id] || []).includes(opt)}
                    onChange={() => toggleCheckbox(q.id, opt)} />
                  <span className="checkbox-box">{(answers[q.id] || []).includes(opt) && '✓'}</span>
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Dropdown */}
          {q.type === 'dropdown' && (
            <select className="form-select" value={answers[q.id]}
              onChange={e => setAnswer(q.id, e.target.value)}>
              <option value="">Select an option...</option>
              {(q.options || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {/* Text */}
          {q.type === 'text' && (
            <textarea className="form-textarea" rows={4}
              placeholder={q.placeholder || 'Type your answer here...'}
              value={answers[q.id]}
              onChange={e => setAnswer(q.id, e.target.value)} />
          )}

          {/* Rating */}
          {q.type === 'rating' && (
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                  className={`star-btn ${Number(answers[q.id]) >= n ? 'active' : ''}`}
                  onClick={() => setAnswer(q.id, n)}>★</button>
              ))}
              {answers[q.id] && (
                <span className="rating-text">{answers[q.id]}/5</span>
              )}
            </div>
          )}

          {/* Linear scale */}
          {q.type === 'linear_scale' && (
            <div className="linear-scale">
              <div className="scale-buttons">
                {Array.from({ length: (q.maxRating || 10) - (q.minRating || 1) + 1 }, (_, i) => i + (q.minRating || 1)).map(n => (
                  <button key={n} type="button"
                    className={`scale-btn ${Number(answers[q.id]) === n ? 'active' : ''}`}
                    onClick={() => setAnswer(q.id, n)}>{n}</button>
                ))}
              </div>
              <div className="scale-labels">
                <span>Low</span><span>High</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="survey-nav">
          {currentQ > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => setCurrentQ(q => q - 1)}>← Back</button>
          )}
          <div style={{ flex: 1 }} />
          {currentQ < totalQ - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setCurrentQ(q => q + 1)} disabled={!canNext()}>
              Next →
            </button>
          ) : (
            <button type="button" className="btn btn-success btn-lg" onClick={handleSubmit} disabled={submitting || !canNext()}>
              {submitting ? <span className="btn-spinner" /> : '✓'}
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
