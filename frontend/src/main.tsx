import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppTest from './App.test';
import './style.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Use AppTest for initial verification, then switch to App
const useTestComponent = false;

root.render(
  <React.StrictMode>
    {useTestComponent ? <AppTest /> : <App />}
  </React.StrictMode>
);
