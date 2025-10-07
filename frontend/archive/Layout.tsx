import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout-container">
      <div className="layout-sidebar">
        <Sidebar />
      </div>
      <div className="layout-main">
        <div className="layout-header">
          <Header />
        </div>
        <div className="layout-content">
          {children}
        </div>
      </div>
    </div>
  );
};
