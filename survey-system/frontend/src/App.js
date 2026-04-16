import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import Sidebar from './components/ui/Sidebar';
import Topbar from './components/ui/Topbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import SurveyBuilder from './pages/SurveyBuilder';
import SurveyAnalytics from './pages/SurveyAnalytics';
import SurveyResponses from './pages/SurveyResponses';
import PublicSurvey from './pages/PublicSurvey';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Topbar />
      <div className="page-content">{children}</div>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/survey/:token" element={<PublicSurvey />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/surveys" element={
        <ProtectedRoute>
          <AppLayout><Surveys /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/surveys/new" element={
        <ProtectedRoute>
          <AppLayout><SurveyBuilder /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/surveys/:id/edit" element={
        <ProtectedRoute>
          <AppLayout><SurveyBuilder /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/surveys/:id/analytics" element={
        <ProtectedRoute>
          <AppLayout><SurveyAnalytics /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/surveys/:id/responses" element={
        <ProtectedRoute>
          <AppLayout><SurveyResponses /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <AppLayout><Analytics /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <AppLayout><Profile /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppRoutes />
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="dark"
          />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
