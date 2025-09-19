import React from 'react';
import './AppLayout.css';

export interface AppLayoutProps {
  leftPanel?: React.ReactNode;
  centerContent: React.ReactNode;
  rightPanel?: React.ReactNode;
  isMobile?: boolean;
  className?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  leftPanel,
  centerContent,
  rightPanel,
  isMobile = false,
  className = ''
}) => {
  const layoutClass = isMobile ? 'app-layout mobile' : 'app-layout desktop';
  
  return (
    <div className={`${layoutClass} ${className}`}>
      {leftPanel && (
        <div className="app-layout-left">
          {leftPanel}
        </div>
      )}
      
      <div className="app-layout-center">
        {centerContent}
      </div>
      
      {rightPanel && (
        <div className="app-layout-right">
          {rightPanel}
        </div>
      )}
    </div>
  );
};

export default AppLayout;
