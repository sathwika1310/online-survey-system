import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { toast } from 'react-toastify';
import { dashboardAPI, responseAPI } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import './SurveyAnalytics.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#8ca0c0', font: { family: 'Space Grotesk', size: 11 } } } },
  scales: {
    x: { grid: { color: 'rgba(42,58,85,0.5)' }, ticks: { color: '#8ca0c0', font: { family: 'Space Grotesk' } } },
    y: { grid: { color: 'rgba(42,58,85,0.5)' }, ticks: { color: '#8ca0c0', font: { family: 'Space Grotesk' } } },
  },
};

export default function SurveyAnalytics() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { on, joinSurveyRoom } = useSocket();

  const load = useCallback(async () => {
    try {
      const { data } = await dashboardAPI.getSurveyAnalytics(id);
      setAnalytics(data.analytics);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    joinSurveyRoom(id);
  }, [load, id, joinSurveyRoom]);

  // Update live on new response
  useEffect(() => {
    const cleanup = on('new-response', (data) => {
      if (data.surveyId === id) {
        load(); // refresh analytics
        toast.info('📊 Analytics updated with new response', { autoClose: 2000 });
      }
    });
    return cleanup;
  }, [on, id, load]);

  const handleExport = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/responses/survey/${id}/export?token=${token}`, '_blank');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  const trendData = {
    labels: analytics?.trend?.map(d => {
      const date = new Date(d._id);
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }) || [],
    datasets: [{
      label: 'Daily Responses',
      data: analytics?.trend?.map(d => d.count) || [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3b82f6',
      pointRadius: 4,
    }],
  };

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Survey Analytics</h1>
          <p className="page-subtitle">Real-time insights and response breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/surveys/${id}/responses`} className="btn btn-secondary">View Responses</Link>
          <button className="btn btn-primary" onClick={handleExport}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Responses', value: analytics?.totalResponses || 0, color: 'blue', icon: '◎' },
          { label: 'Avg. Completion Time', value: `${Math.round(analytics?.avgTimeTaken || 0)}s`, color: 'green', icon: '◉' },
          { label: 'Questions', value: analytics?.questionAnalytics?.length || 0, color: 'purple', icon: '◈' },
          { label: 'Response Rate', value: analytics?.totalResponses > 0 ? '100%' : '0%', color: 'orange', icon: '⬡' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Response Trend (30 days)</h3>
            <p className="chart-subtitle">Daily submissions over the past month</p>
          </div>
          <div className="live-badge"><span className="live-dot" />LIVE</div>
        </div>
        <div style={{ height: 240 }}>
          <Line data={trendData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} />
        </div>
      </div>

      {/* Per-question analytics */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Question Breakdown
      </h2>

      <div className="questions-analytics">
        {analytics?.questionAnalytics?.map((qa, idx) => (
          <QuestionChart key={qa.questionId} qa={qa} idx={idx} />
        ))}
      </div>

      {analytics?.questionAnalytics?.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <h3 className="empty-state-title">No responses yet</h3>
          <p className="empty-state-desc">Share your survey to start collecting data.</p>
        </div>
      )}
    </div>
  );
}

function QuestionChart({ qa, idx }) {
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6'];

  if (qa.type === 'text') {
    return (
      <div className="card question-chart-card">
        <div className="qchart-header">
          <span className="qchart-num">Q{idx + 1}</span>
          <div>
            <h4 className="qchart-title">{qa.question}</h4>
            <span className="badge badge-blue">Text Responses · {qa.total}</span>
          </div>
        </div>
        <div className="text-responses">
          {(qa.responses || []).map((r, i) => (
            <div key={i} className="text-response-item">"{r}"</div>
          ))}
          {qa.total > qa.responses?.length && (
            <p className="text-more">+ {qa.total - qa.responses.length} more responses</p>
          )}
        </div>
      </div>
    );
  }

  if (qa.type === 'rating' || qa.type === 'linear_scale') {
    const labels = Object.keys(qa.distribution || {});
    const values = Object.values(qa.distribution || {});
    const barData = {
      labels,
      datasets: [{
        label: 'Responses',
        data: values,
        backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
        borderRadius: 6,
        borderWidth: 0,
      }],
    };
    return (
      <div className="card question-chart-card">
        <div className="qchart-header">
          <span className="qchart-num">Q{idx + 1}</span>
          <div>
            <h4 className="qchart-title">{qa.question}</h4>
            <span className="badge badge-orange">Avg: {qa.avg} / {Math.max(...labels.map(Number))}</span>
          </div>
        </div>
        <div style={{ height: 180 }}>
          <Bar data={barData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: 'rgba(42,58,85,0.5)' }, ticks: { color: '#8ca0c0' } },
              y: { grid: { color: 'rgba(42,58,85,0.5)' }, ticks: { color: '#8ca0c0', stepSize: 1 } },
            },
          }} />
        </div>
      </div>
    );
  }

  // MCQ, checkbox, dropdown → Doughnut
  const dist = qa.distribution || {};
  const labels = Object.keys(dist);
  const values = Object.values(dist);
  const total = values.reduce((a, b) => a + b, 0);

  const donutData = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: COLORS.slice(0, labels.length),
      borderColor: 'var(--bg-card)',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  };

  return (
    <div className="card question-chart-card">
      <div className="qchart-header">
        <span className="qchart-num">Q{idx + 1}</span>
        <div>
          <h4 className="qchart-title">{qa.question}</h4>
          <span className="badge badge-purple">{total} responses</span>
        </div>
      </div>
      <div className="donut-layout">
        <div style={{ height: 200, width: 200, flexShrink: 0 }}>
          <Doughnut data={donutData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            cutout: '65%',
          }} />
        </div>
        <div className="donut-legend">
          {labels.map((label, i) => (
            <div key={i} className="legend-row">
              <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="legend-label">{label}</span>
              <span className="legend-count">{values[i]}</span>
              <span className="legend-pct">{total ? Math.round((values[i] / total) * 100) : 0}%</span>
              <div className="legend-bar-track">
                <div className="legend-bar-fill" style={{
                  width: `${total ? (values[i] / total) * 100 : 0}%`,
                  background: COLORS[i % COLORS.length],
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
