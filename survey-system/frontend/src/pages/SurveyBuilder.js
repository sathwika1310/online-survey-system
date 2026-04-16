import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { surveyAPI } from '../utils/api';
import { v4 as uuidv4 } from '../utils/uuid';
import './SurveyBuilder.css';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: '◉' },
  { value: 'text', label: 'Text Answer', icon: '✎' },
  { value: 'rating', label: 'Star Rating', icon: '★' },
  { value: 'checkbox', label: 'Checkboxes', icon: '☑' },
  { value: 'dropdown', label: 'Dropdown', icon: '▾' },
  { value: 'linear_scale', label: 'Linear Scale', icon: '⟺' },
];

const defaultQuestion = () => ({
  id: uuidv4(),
  type: 'mcq',
  question: '',
  required: false,
  options: ['Option A', 'Option B'],
  minRating: 1,
  maxRating: 5,
  placeholder: '',
  order: 0,
});

export default function SurveyBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    isActive: true,
    allowAnonymous: true,
    allowMultipleSubmissions: false,
    estimatedTime: 5,
    theme: 'default',
    tags: '',
  });
  const [questions, setQuestions] = useState([defaultQuestion()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeQ, setActiveQ] = useState(0);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await surveyAPI.getById(id);
        const s = data.survey;
        setForm({
          title: s.title,
          description: s.description || '',
          isActive: s.isActive,
          allowAnonymous: s.allowAnonymous,
          allowMultipleSubmissions: s.allowMultipleSubmissions,
          estimatedTime: s.estimatedTime || 5,
          theme: s.theme || 'default',
          tags: (s.tags || []).join(', '),
        });
        setQuestions(s.questions.length > 0 ? s.questions : [defaultQuestion()]);
      } catch {
        toast.error('Failed to load survey');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const addQuestion = (type = 'mcq') => {
    const q = { ...defaultQuestion(), type, id: uuidv4(), order: questions.length };
    setQuestions([...questions, q]);
    setActiveQ(questions.length);
  };

  const updateQuestion = (idx, updates) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const removeQuestion = (idx) => {
    if (questions.length === 1) return toast.error('Survey must have at least one question');
    setQuestions(questions.filter((_, i) => i !== idx));
    setActiveQ(Math.max(0, activeQ - 1));
  };

  const moveQuestion = (idx, direction) => {
    const newQ = [...questions];
    const target = idx + direction;
    if (target < 0 || target >= newQ.length) return;
    [newQ[idx], newQ[target]] = [newQ[target], newQ[idx]];
    setQuestions(newQ);
    setActiveQ(target);
  };

  const addOption = (qIdx) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] });
  };

  const updateOption = (qIdx, oIdx, val) => {
    const opts = [...questions[qIdx].options];
    opts[oIdx] = val;
    updateQuestion(qIdx, { options: opts });
  };

  const removeOption = (qIdx, oIdx) => {
    if (questions[qIdx].options.length <= 2) return toast.error('Minimum 2 options required');
    updateQuestion(qIdx, { options: questions[qIdx].options.filter((_, i) => i !== oIdx) });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Survey title is required');
    const emptyQ = questions.findIndex(q => !q.question.trim());
    if (emptyQ >= 0) {
      setActiveQ(emptyQ);
      return toast.error(`Question ${emptyQ + 1} is empty`);
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        questions: questions.map((q, i) => ({ ...q, order: i })),
      };

      if (isEdit) {
        await surveyAPI.update(id, payload);
        toast.success('Survey updated!');
      } else {
        await surveyAPI.create(payload);
        toast.success('Survey created!');
      }
      navigate('/surveys');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save survey');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="builder-loading"><div className="spinner" /></div>;

  const activeQuestion = questions[activeQ];

  return (
    <div className="builder">
      {/* Top bar */}
      <div className="builder-topbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/surveys')}>← Back</button>
        <h2 className="builder-heading">{isEdit ? 'Edit Survey' : 'New Survey'}</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="btn-spinner" /> : '✓'}
          {saving ? 'Saving...' : 'Save Survey'}
        </button>
      </div>

      <div className="builder-layout">
        {/* Left: Question list + add */}
        <div className="builder-sidebar">
          <div className="question-list">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={`question-thumb ${idx === activeQ ? 'active' : ''} ${!q.question ? 'empty' : ''}`}
                onClick={() => setActiveQ(idx)}
              >
                <div className="qthumb-num">{idx + 1}</div>
                <div className="qthumb-info">
                  <div className="qthumb-text">{q.question || 'Untitled question'}</div>
                  <div className="qthumb-type">{QUESTION_TYPES.find(t => t.value === q.type)?.label}</div>
                </div>
                {q.required && <span className="required-dot">*</span>}
              </div>
            ))}
          </div>

          <div className="add-question-section">
            <p className="add-q-label">Add Question</p>
            <div className="question-type-grid">
              {QUESTION_TYPES.map(type => (
                <button key={type.value} className="add-type-btn" onClick={() => addQuestion(type.value)}>
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Question editor */}
        <div className="builder-center">
          {activeQuestion && (
            <div className="question-editor card">
              <div className="qeditor-header">
                <div className="qeditor-num">Q{activeQ + 1}</div>
                <select
                  className="form-select type-select"
                  value={activeQuestion.type}
                  onChange={e => updateQuestion(activeQ, { type: e.target.value, options: ['Option A', 'Option B'] })}
                >
                  {QUESTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
                <div className="qeditor-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => moveQuestion(activeQ, -1)} disabled={activeQ === 0}>↑</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => moveQuestion(activeQ, 1)} disabled={activeQ === questions.length - 1}>↓</button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(activeQ)}>✕</button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <input
                  type="text"
                  className="form-input question-input"
                  placeholder="Enter your question..."
                  value={activeQuestion.question}
                  onChange={e => updateQuestion(activeQ, { question: e.target.value })}
                />
              </div>

              {/* MCQ / Checkbox / Dropdown options */}
              {['mcq', 'checkbox', 'dropdown'].includes(activeQuestion.type) && (
                <div className="form-group">
                  <label className="form-label">Options</label>
                  <div className="options-list">
                    {(activeQuestion.options || []).map((opt, oIdx) => (
                      <div key={oIdx} className="option-row">
                        <span className="option-prefix">{activeQuestion.type === 'mcq' ? '◉' : '☑'}</span>
                        <input
                          type="text"
                          className="form-input"
                          value={opt}
                          onChange={e => updateOption(activeQ, oIdx, e.target.value)}
                          placeholder={`Option ${oIdx + 1}`}
                        />
                        <button className="btn btn-danger btn-sm" onClick={() => removeOption(activeQ, oIdx)}>✕</button>
                      </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" onClick={() => addOption(activeQ)}>+ Add Option</button>
                  </div>
                </div>
              )}

              {/* Rating config */}
              {activeQuestion.type === 'rating' && (
                <div className="rating-preview">
                  <label className="form-label">Rating Preview</label>
                  <div className="stars-preview">
                    {[1, 2, 3, 4, 5].map(n => <span key={n} className="star-preview">★</span>)}
                  </div>
                  <p className="rating-note">1–5 star rating scale</p>
                </div>
              )}

              {/* Linear scale */}
              {activeQuestion.type === 'linear_scale' && (
                <div className="form-group">
                  <label className="form-label">Scale Range</label>
                  <div className="scale-range">
                    <div>
                      <label className="form-label">Min</label>
                      <input type="number" className="form-input" style={{ width: 80 }}
                        value={activeQuestion.minRating} min={0} max={5}
                        onChange={e => updateQuestion(activeQ, { minRating: Number(e.target.value) })} />
                    </div>
                    <span className="scale-dash">—</span>
                    <div>
                      <label className="form-label">Max</label>
                      <input type="number" className="form-input" style={{ width: 80 }}
                        value={activeQuestion.maxRating} min={2} max={10}
                        onChange={e => updateQuestion(activeQ, { maxRating: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Text placeholder */}
              {activeQuestion.type === 'text' && (
                <div className="form-group">
                  <label className="form-label">Placeholder Text</label>
                  <input type="text" className="form-input"
                    placeholder="Enter placeholder..."
                    value={activeQuestion.placeholder}
                    onChange={e => updateQuestion(activeQ, { placeholder: e.target.value })} />
                </div>
              )}

              <div className="required-toggle">
                <label className="toggle-label">
                  <input type="checkbox" checked={activeQuestion.required}
                    onChange={e => updateQuestion(activeQ, { required: e.target.checked })} />
                  <span className="toggle-track" />
                  <span>Required question</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right: Survey settings */}
        <div className="builder-settings">
          <div className="card">
            <h3 className="settings-title">Survey Settings</h3>

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input type="text" className="form-input" placeholder="Survey title..."
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} placeholder="Brief description..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input type="text" className="form-input" placeholder="research, feedback..."
                value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Time (min)</label>
              <input type="number" className="form-input" min={1} max={60}
                value={form.estimatedTime} onChange={e => setForm({ ...form, estimatedTime: Number(e.target.value) })} />
            </div>

            <div className="settings-toggles">
              {[
                { key: 'isActive', label: 'Active (accepting responses)' },
                { key: 'allowAnonymous', label: 'Allow anonymous responses' },
                { key: 'allowMultipleSubmissions', label: 'Allow multiple submissions' },
              ].map(({ key, label }) => (
                <label key={key} className="toggle-label">
                  <input type="checkbox" checked={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                  <span className="toggle-track" />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="survey-summary">
              <div className="summary-row"><span>Questions</span><strong>{questions.length}</strong></div>
              <div className="summary-row"><span>Required</span><strong>{questions.filter(q => q.required).length}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
