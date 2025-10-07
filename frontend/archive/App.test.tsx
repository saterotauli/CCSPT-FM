import React, { useEffect, useRef } from 'react';

// Simple test component to verify React setup
const AppTest: React.FC = () => {
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('React App Test component mounted successfully!');
  }, []);

  return (
    <div ref={appRef} id="app" style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a1d23',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>BIM App - React Migration Test</h1>
        <p>React with TypeScript is working correctly!</p>
        <p>Ready to load BIM components...</p>
      </div>
    </div>
  );
};

export default AppTest;
