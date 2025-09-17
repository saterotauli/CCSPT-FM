import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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
    <BrowserRouter>
      {useTestComponent ? <AppTest /> : <App />}
    </BrowserRouter>
  </React.StrictMode>
);
