import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { surveyAPI } from '../utils/api';
import './Surveys.css';

const CLIENT_URL = process.env.REACT_APP_CLIENT_URL || 'http://localhost:3000';

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  const loadSurveys = useCallback(async () => {
    try {
      const { data } = await surveyAPI.getAll();
      setSurveys(data.surveys);
    } catch {
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this survey and all its responses?')) return;
    try {
      await surveyAPI.delete(id);
      setSurveys(surveys.filter(s => s._id !== id));
      toast.success('Survey deleted');
    } catch {
      toast.error('Failed to delete survey');
    }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await surveyAPI.toggle(id);
      setSurveys(surveys.map(s => s._id === id ? { ...s, isActive: data.survey.isActive } : s));
      toast.success(`Survey ${data.survey.isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to toggle survey');
    }
  };

  const handleCopyLink = (survey) => {
    const url = `${CLIENT_URL}/survey/${survey.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(survey._id);
    toast.success('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = surveys.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'active' ? s.isActive : !s.isActive);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Surveys</h1>
          <p className="page-subtitle">{surveys.length} total · {surveys.filter(s => s.isActive).length} active</p>
        </div>
        <Link to="/surveys/new" className="btn btn-primary">
          <span>⊕</span> New Survey
        </Link>
      </div>

      {/* Filters */}
      <div className="surveys-toolbar">
        <input
          type="text"
          className="form-input search-input"
          placeholder="Search surveys..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {['all', 'active', 'inactive'].map(f => (
            <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="surveys-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="survey-card skeleton" style={{ height: 200 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <h3 className="empty-state-title">No surveys found</h3>
          <p className="empty-state-desc">
            {search ? 'Try adjusting your search.' : 'Create your first survey to get started.'}
          </p>
          <Link to="/surveys/new" className="btn btn-primary">Create Survey</Link>
        </div>
      ) : (
        <div className="surveys-grid">
          {filtered.map(survey => (
            <div key={survey._id} className={`survey-card ${!survey.isActive ? 'inactive' : ''}`}>
              <div className="survey-card-header">
                <div className="survey-type-icon">◈</div>
                <div className="survey-card-badges">
                  <span className={`badge ${survey.isActive ? 'badge-green' : 'badge-red'}`}>
                    {survey.isActive ? '● Active' : '○ Inactive'}
                  </span>
                  {survey.questions?.length > 0 && (
                    <span className="badge badge-blue">{survey.questions.length}Q</span>
                  )}
                </div>
              </div>

              <h3 className="survey-title">{survey.title}</h3>
              {survey.description && (
                <p className="survey-description">{survey.description.slice(0, 80)}{survey.description.length > 80 ? '…' : ''}</p>
              )}

              <div className="survey-stats">
                <div className="survey-stat">
                  <span className="survey-stat-value">{survey.totalResponses || 0}</span>
                  <span className="survey-stat-label">Responses</span>
                </div>
                <div className="survey-stat">
                  <span className="survey-stat-value">{survey.estimatedTime || 5}m</span>
                  <span className="survey-stat-label">Est. Time</span>
                </div>
                <div className="survey-stat">
                  <span className="survey-stat-value">{new Date(survey.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  <span className="survey-stat-label">Created</span>
                </div>
              </div>

              <div className="survey-actions">
                <Link to={`/surveys/${survey._id}/analytics`} className="btn btn-secondary btn-sm" title="Analytics">
                  ◎ Analytics
                </Link>
                <Link to={`/surveys/${survey._id}/responses`} className="btn btn-secondary btn-sm" title="Responses">
                  ◉ Responses
                </Link>
                <button className="btn btn-secondary btn-sm" onClick={() => handleCopyLink(survey)} title="Copy share link">
                  {copiedId === survey._id ? '✓' : '⟐'}
                </button>
                <Link to={`/surveys/${survey._id}/edit`} className="btn btn-secondary btn-sm" title="Edit">
                  ✎
                </Link>
                <button className={`btn btn-sm ${survey.isActive ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => handleToggle(survey._id)} title="Toggle active">
                  {survey.isActive ? '⏸' : '▶'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(survey._id)} title="Delete">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
