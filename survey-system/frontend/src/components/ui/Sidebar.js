import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { to: '/surveys', icon: '◈', label: 'My Surveys' },
  { to: '/surveys/new', icon: '⊕', label: 'New Survey' },
  { to: '/analytics', icon: '◎', label: 'Analytics' },
  { to: '/profile', icon: '◉', label: 'Profile' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          {!collapsed && <span className="logo-text">SurveyOS</span>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div className="live-status">
        <span className={`live-dot ${connected ? 'connected' : 'disconnected'}`} />
        {!collapsed && (
          <span className="live-label">{connected ? 'Live' : 'Offline'}</span>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{isAdmin ? '★ Admin' : 'User'}</div>
            </div>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <span>⏻</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
