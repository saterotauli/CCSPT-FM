import React from 'react';
import styles from './Layout.module.css';

export interface LayoutProps {
  leftPanel?: React.ReactNode;
  centerContent: React.ReactNode;
  rightPanel?: React.ReactNode;
  isMobile?: boolean;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  leftPanel,
  centerContent,
  rightPanel,
  isMobile = false,
  className = ''
}) => {
  const layoutClass = isMobile ? `${styles.appLayout} ${styles.mobile}` : `${styles.appLayout} ${styles.desktop}`;
  const noRightClass = !rightPanel ? styles.noRight : '';
  
  return (
    <div className={`${layoutClass} ${noRightClass} ${className}`}>
      {leftPanel && (
        <div className={styles.appLayoutLeft}>
          {leftPanel}
        </div>
      )}
      
      <div className={styles.appLayoutCenter}>
        {centerContent}
      </div>
      
      {rightPanel && (
        <div className={styles.appLayoutRight}>
          {rightPanel}
        </div>
      )}
    </div>
  );
};

export default Layout;
