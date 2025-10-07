import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 20px 0' }}>🏗️</h1>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>CCSPT-FM Test</h2>
        <p style={{ margin: '0 0 30px 0', fontSize: '18px', opacity: 0.9 }}>
          ✅ React está funcionando correctamente
        </p>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>Estado del Sistema</h3>
          <p style={{ margin: '0', fontSize: '14px' }}>
            Si ves este mensaje, el frontend está compilando correctamente
          </p>
        </div>

        <button 
          onClick={() => {
            console.log('✅ Test button clicked');
            alert('✅ JavaScript está funcionando correctamente');
          }}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Probar JavaScript
        </button>
      </div>
    </div>
  );
};

export default TestApp;
