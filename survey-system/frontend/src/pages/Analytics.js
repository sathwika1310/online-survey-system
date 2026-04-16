import React, { useState, useEffect, useCallback } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { toast } from 'react-toastify';
import { analyticsAPI, surveyAPI } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];

const chartBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#8ca0c0', font: { family: 'Space Grotesk', size: 11 } } } },
  scales: {
    x: { grid: { color: 'rgba(42,58,85,0.5)' }, ticks: { color: '#8ca0c0', font: { family: 'Space Grotesk' } } },
    y: { grid: { color: 'rgba(42,58,85,0.5)' }, ticks: { color: '#8ca0c0', font: { family: 'Space Grotesk' } } },
  },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [surveyFilter, setSurveyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (surveyFilter) params.surveyId = surveyFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      const { data: res } = await analyticsAPI.getOverview(params);
      setData(res.analytics);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [surveyFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  // Monthly trend chart
  const monthlyData = {
    labels: data?.monthlyTrend?.map(d => {
      const [y, m] = d._id.split('-');
      return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }) || [],
    datasets: [{
      label: 'Responses',
      data: data?.monthlyTrend?.map(d => d.count) || [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3b82f6',
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  };

  // Hourly distribution
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const hourCounts = Array(24).fill(0);
  data?.hourlyDist?.forEach(h => { hourCounts[h._id] = h.count; });

  const hourlyData = {
    labels: hourLabels,
    datasets: [{
      label: 'Responses by Hour',
      data: hourCounts,
      backgroundColor: hourCounts.map((_, i) => {
        if (i >= 9 && i <= 17) return 'rgba(59,130,246,0.8)';
        if (i >= 18 && i <= 22) return 'rgba(139,92,246,0.8)';
        return 'rgba(42,58,85,0.8)';
      }),
      borderRadius: 4,
      borderWidth: 0,
    }],
  };

  // Day of week
  const weekCounts = Array(7).fill(0);
  data?.weeklyDist?.forEach(d => { weekCounts[d._id - 1] = d.count; });

  const weeklyData = {
    labels: DAYS,
    datasets: [{
      label: 'Responses',
      data: weekCounts,
      backgroundColor: COLORS.map(c => c + 'cc'),
      borderRadius: 6,
      borderWidth: 0,
    }],
  };

  // Survey comparison
  const surveyCompData = {
    labels: data?.surveyComparison?.map(s => s.title?.slice(0, 18) + (s.title?.length > 18 ? '…' : '')) || [],
    datasets: [{
      label: 'Responses',
      data: data?.surveyComparison?.map(s => s.count) || [],
      backgroundColor: COLORS,
      borderRadius: 6,
      borderWidth: 0,
    }],
  };

  const totalResponses = data?.surveyComparison?.reduce((a, s) => a + s.count, 0) || 0;
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const topDay = DAYS[weekCounts.indexOf(Math.max(...weekCounts))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Comprehensive insights across all surveys</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: '0 0 220px' }}>
            <label className="form-label">Filter by Survey</label>
            <select className="form-select" value={surveyFilter} onChange={e => setSurveyFilter(e.target.value)}>
              <option value="">All Surveys</option>
              {data?.availableSurveys?.map(s => (
                <option key={s._id} value={s._id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={() => { setSurveyFilter(''); setDateFrom(''); setDateTo(''); }}>
            Reset
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Responses', value: totalResponses.toLocaleString(), color: 'blue', icon: '◎' },
          { label: 'Peak Hour', value: `${peakHour}:00`, color: 'green', icon: '◉' },
          { label: 'Busiest Day', value: topDay, color: 'purple', icon: '◈' },
          { label: 'Surveys Tracked', value: data?.availableSurveys?.length || 0, color: 'orange', icon: '⬡' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>6-Month Trend</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Monthly response volume</p>
          </div>
        </div>
        <div style={{ height: 260 }}>
          <Line data={monthlyData} options={{ ...chartBase, plugins: { ...chartBase.plugins, legend: { display: false } } }} />
        </div>
      </div>

      <div className="charts-grid" style={{ marginBottom: 20 }}>
        {/* Hourly heatmap */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Responses by Hour of Day</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            <span style={{ color: 'var(--accent-blue)' }}>■</span> Business hours &nbsp;
            <span style={{ color: 'var(--accent-purple)' }}>■</span> Evening
          </p>
          <div style={{ height: 220 }}>
            <Bar data={hourlyData} options={{ ...chartBase, plugins: { ...chartBase.plugins, legend: { display: false } } }} />
          </div>
        </div>

        {/* Day of week */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Responses by Day of Week</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Weekly distribution pattern</p>
          <div style={{ height: 220 }}>
            <Bar data={weeklyData} options={{ ...chartBase, plugins: { ...chartBase.plugins, legend: { display: false } } }} />
          </div>
        </div>
      </div>

      {/* Survey comparison */}
      {(data?.surveyComparison?.length || 0) > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Survey Performance Comparison</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Response count per survey</p>
          <div style={{ height: 300 }}>
            <Bar data={surveyCompData} options={{
              ...chartBase,
              indexAxis: 'y',
              plugins: { ...chartBase.plugins, legend: { display: false } },
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
