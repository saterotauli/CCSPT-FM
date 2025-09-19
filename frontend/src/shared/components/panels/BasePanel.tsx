import React from 'react';
import './BasePanel.css';

export interface BasePanelProps {
  title: string;
  loading?: boolean;
  error?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const BasePanel: React.FC<BasePanelProps> = ({
  title,
  loading = false,
  error,
  actions,
  children,
  className = ''
}) => {
  return (
    <div className={`base-panel ${className}`}>
      <div className="base-panel-header">
        <h3 className="base-panel-title">{title}</h3>
        {actions && <div className="base-panel-actions">{actions}</div>}
      </div>
      
      <div className="base-panel-content">
        {loading && (
          <div className="base-panel-loading">
            <div className="loading-spinner"></div>
            <span>Cargando...</span>
          </div>
        )}
        
        {error && (
          <div className="base-panel-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        {!loading && !error && children}
      </div>
    </div>
  );
};

export default BasePanel;
