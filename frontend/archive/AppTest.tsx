import React from 'react';

const AppTest: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f9ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ color: '#3b82f6', marginBottom: '20px' }}>
          🏗️ CCSPT-FM Test
        </h1>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '18px', color: '#10b981' }}>
            ✅ React está funcionando correctamente
          </p>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Si ves este mensaje, el frontend está cargando bien.
          </p>
        </div>

        <div style={{
          background: '#f0f9ff',
          padding: '15px',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Estado del Sistema:</h3>
          <p>🔗 Frontend: http://localhost:5173/</p>
          <p>🔗 Backend: http://localhost:4000/</p>
          <p>📊 Base de datos: PostgreSQL</p>
        </div>

        <button 
          onClick={() => {
            fetch('http://localhost:4000/api/v2/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nombre: 'Admin',
                apellidos: 'Sistema',
                email: 'admin@ccspt.com',
                password: 'admin123',
                rol: 'ADMIN'
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.usuario) {
                alert('✅ Usuario creado: ' + data.usuario.email);
              } else if (data.error) {
                alert('ℹ️ ' + data.error);
              }
            })
            .catch(error => {
              alert('❌ Error: ' + error.message);
            });
          }}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          Crear Usuario Admin
        </button>

        <button 
          onClick={() => {
            const email = prompt('Email:', 'admin@ccspt.com');
            const password = prompt('Password:', 'admin123');
            
            if (email && password) {
              fetch('http://localhost:4000/api/v2/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              })
              .then(response => response.json())
              .then(data => {
                if (data.token) {
                  alert('✅ Login exitoso: ' + data.usuario.nombre);
                } else {
                  alert('❌ Error: ' + data.error);
                }
              })
              .catch(error => {
                alert('❌ Error: ' + error.message);
              });
            }
          }}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Probar Login
        </button>
      </div>
    </div>
  );
};

export default AppTest;
