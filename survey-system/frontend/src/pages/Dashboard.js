import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { toast } from 'react-toastify';
import { dashboardAPI } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_DEFAULTS = {
  plugins: { legend: { labels: { color: '#8ca0c0', font: { family: 'Space Grotesk', size: 12 } } } },
  scales: {
    x: { grid: { color: 'rgba(42,58,85,0.6)' }, ticks: { color: '#8ca0c0', font: { family: 'Space Grotesk' } } },
    y: { grid: { color: 'rgba(42,58,85,0.6)' }, ticks: { color: '#8ca0c0', font: { family: 'Space Grotesk' } } },
  },
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveResponses, setLiveResponses] = useState([]);
  const { on } = useSocket();
  const { user } = useAuth();

  const loadStats = useCallback(async () => {
    try {
      const { data } = await dashboardAPI.getStats();
      setStats(data.stats);
    } catch {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Real-time socket listener
  useEffect(() => {
    const cleanup = on('new-response', (data) => {
      setLiveResponses((prev) => [data, ...prev].slice(0, 5));
      setStats((prev) => {
        if (!prev) return prev;
        const today = new Date().toISOString().split('T')[0];
        const updatedTrend = [...(prev.dailyTrend || [])];
        const todayIdx = updatedTrend.findIndex(d => d._id === today);
        if (todayIdx >= 0) {
          updatedTrend[todayIdx] = { ...updatedTrend[todayIdx], count: updatedTrend[todayIdx].count + 1 };
        } else {
          updatedTrend.push({ _id: today, count: 1 });
        }
        return { ...prev, totalResponses: prev.totalResponses + 1, dailyTrend: updatedTrend };
      });
      toast.success(`🎉 New response on survey!`, { autoClose: 2000 });
    });
    return cleanup;
  }, [on]);

  if (loading) return (
    <div>
      <div className="stats-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card"><div className="skeleton" style={{ height: 100 }} /></div>
        ))}
      </div>
    </div>
  );

  // Chart data
  const trendLabels = stats?.dailyTrend?.map(d => {
    const date = new Date(d._id);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }) || [];

  const trendCounts = stats?.dailyTrend?.map(d => d.count) || [];

  const lineChartData = {
    labels: trendLabels,
    datasets: [{
      label: 'Responses',
      data: trendCounts,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3b82f6',
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const topSurveyData = {
    labels: stats?.topSurveys?.map(s => s.title?.slice(0, 20) + (s.title?.length > 20 ? '…' : '')) || [],
    datasets: [{
      label: 'Responses',
      data: stats?.topSurveys?.map(s => s.count) || [],
      backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(139,92,246,0.8)', 'rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)', 'rgba(236,72,153,0.8)'],
      borderRadius: 6,
      borderWidth: 0,
    }],
  };

  const statCards = [
    { label: 'Total Surveys', value: stats?.totalSurveys || 0, icon: '◈', color: 'blue', trend: '+12%' },
    { label: 'Total Responses', value: stats?.totalResponses || 0, icon: '◎', color: 'green', trend: '+28%' },
    { label: 'Active Surveys', value: stats?.activeSurveys || 0, icon: '⬡', color: 'purple', trend: null },
    { label: 'Avg. Completion Time', value: `${stats?.avgCompletionTime || 0}s`, icon: '◉', color: 'orange', trend: '-5%' },
  ];

  return (
    <div className="dashboard">
      {/* Stats */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className={`stat-card ${card.color}`}>
            <div className={`stat-icon ${card.color}`}>{card.icon}</div>
            <div className="stat-value">{card.value.toLocaleString?.() ?? card.value}</div>
            <div className="stat-label">{card.label}</div>
            {card.trend && (
              <div className={`stat-trend ${card.trend.startsWith('+') ? 'up' : 'down'}`}>
                {card.trend.startsWith('+') ? '▲' : '▼'} {card.trend} this week
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="charts-grid">
        <div className="card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Response Trend</h3>
              <p className="chart-subtitle">Last 7 days activity</p>
            </div>
            <div className="live-badge">
              <span className="live-dot" />
              LIVE
            </div>
          </div>
          <Line data={lineChartData} options={{
            ...CHART_DEFAULTS,
            responsive: true,
            maintainAspectRatio: false,
            plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
          }} height={220} />
        </div>

        <div className="card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Top Surveys</h3>
              <p className="chart-subtitle">By response count</p>
            </div>
          </div>
          <Bar data={topSurveyData} options={{
            ...CHART_DEFAULTS,
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
          }} height={220} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="dashboard-bottom">
        {/* Recent activity */}
        <div className="card">
          <div className="chart-header">
            <h3 className="chart-title">Live Feed</h3>
            {liveResponses.length > 0 && <span className="badge badge-green">+{liveResponses.length} new</span>}
          </div>
          {liveResponses.length === 0 && (!stats?.recentResponses?.length) ? (
            <div className="empty-state">
              <div className="empty-state-icon">◎</div>
              <p className="empty-state-title">Waiting for responses...</p>
              <p className="empty-state-desc">Share a survey to start collecting responses in real-time.</p>
            </div>
          ) : (
            <div className="activity-list">
              {[...liveResponses.map(r => ({ ...r.response, surveyTitle: r.surveyId, isNew: true })),
                ...(stats?.recentResponses || [])].slice(0, 8).map((r, i) => (
                <div key={i} className={`activity-item ${r.isNew ? 'new-item' : ''}`}>
                  <div className="activity-avatar">{(r.respondentName || 'A')[0].toUpperCase()}</div>
                  <div className="activity-info">
                    <div className="activity-name">{r.respondentName || 'Anonymous'}</div>
                    <div className="activity-survey">{r.survey?.title || 'Survey response'}</div>
                  </div>
                  <div className="activity-time">
                    {r.isNew ? <span className="badge badge-green">New</span>
                      : new Date(r.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 className="chart-title" style={{ marginBottom: 20 }}>Quick Actions</h3>
          <div className="quick-actions">
            <Link to="/surveys/new" className="quick-action-btn">
              <span className="qa-icon">⊕</span>
              <div>
                <div className="qa-label">New Survey</div>
                <div className="qa-desc">Build from scratch</div>
              </div>
            </Link>
            <Link to="/surveys" className="quick-action-btn">
              <span className="qa-icon">◈</span>
              <div>
                <div className="qa-label">My Surveys</div>
                <div className="qa-desc">View all surveys</div>
              </div>
            </Link>
            <Link to="/analytics" className="quick-action-btn">
              <span className="qa-icon">◎</span>
              <div>
                <div className="qa-label">Analytics</div>
                <div className="qa-desc">Deep insights</div>
              </div>
            </Link>
          </div>

          <div className="welcome-banner">
            <div className="welcome-greeting">Hello, {user?.name?.split(' ')[0]} 👋</div>
            <div className="welcome-text">You have <strong>{stats?.totalResponses || 0}</strong> total responses across <strong>{stats?.totalSurveys || 0}</strong> surveys.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
