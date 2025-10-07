import React, { useState, useEffect } from 'react';
import { authService, User } from './services/authService';
import Header from '@shared/components/layout/Header';
import Dashboard from './features/dashboard/components/Dashboard';
import UserManagement from './features/users/components/UserManagement';
import TaskManagement from './features/tasks/components/TaskManagement';
import MyTasks from './features/tasks/components/MyTasks';
import Espais from './features/espais/pages/Espais';
import './AppWithAuth.css';

// Login Component
const LoginForm: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.login(credentials.email, credentials.password);
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <div className="app-logo">
            <span className="logo-icon">🏗️</span>
            <span className="logo-text">CCSPT-FM</span>
          </div>
          <h1>Iniciar Sesión</h1>
          <p>Accede al sistema de gestión de facilities</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="login-footer">
          <p>Sistema de Gestión de Facilities - CCSPT</p>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const AppWithAuth: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService.getUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    const currentUser = authService.getUser();
    setUser(currentUser);
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section);
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'user-management':
        return <UserManagement />;
      case 'task-management':
        return <TaskManagement />;
      case 'my-tasks':
        return <MyTasks />;
      case 'messaging':
        return (
          <div className="coming-soon">
            <h2>💬 Sistema de Mensajería</h2>
            <p>Esta funcionalidad estará disponible próximamente</p>
          </div>
        );
      case 'espais':
        return <Espais />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="app-with-auth">
      <Header 
        onNavigate={handleNavigate} 
        currentSection={currentSection} 
      />
      <main className="app-main">
        {renderCurrentSection()}
      </main>
    </div>
  );
};

export default AppWithAuth;
