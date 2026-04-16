import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import './Topbar.css';

const routeTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Real-time overview of all activity' },
  '/surveys': { title: 'My Surveys', subtitle: 'Manage and share your surveys' },
  '/surveys/new': { title: 'New Survey', subtitle: 'Build a new survey from scratch' },
  '/analytics': { title: 'Analytics', subtitle: 'Deep insights and trends' },
  '/profile': { title: 'Profile', subtitle: 'Manage your account settings' },
};

export default function Topbar() {
  const location = useLocation();
  const { connected } = useSocket();

  const getTitle = () => {
    for (const [path, info] of Object.entries(routeTitles)) {
      if (location.pathname === path || location.pathname.startsWith(path + '/')) {
        if (path !== '/surveys' || location.pathname === '/surveys') return info;
      }
    }
    if (location.pathname.includes('/edit')) return { title: 'Edit Survey', subtitle: 'Modify your survey' };
    if (location.pathname.includes('/analytics')) return { title: 'Survey Analytics', subtitle: 'Response insights' };
    if (location.pathname.includes('/responses')) return { title: 'Responses', subtitle: 'View all submissions' };
    return { title: 'SurveyOS', subtitle: '' };
  };

  const { title, subtitle } = getTitle();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>
      <div className="topbar-right">
        <div className={`connection-status ${connected ? 'online' : 'offline'}`}>
          <span className="status-dot" />
          <span>{connected ? 'Live Updates On' : 'Reconnecting...'}</span>
        </div>
        <div className="topbar-time">
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
