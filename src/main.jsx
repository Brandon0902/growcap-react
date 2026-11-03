import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { AuthProvider } from './features/auth/context/AuthContext.jsx';
import './styles/global.css';
import './styles/accessibility.css';
import './components/common/GrowCapAssistantWidget.css';

// Registrar Service Worker para PWA, Badging API y Web Push en Safari iOS 16.4+
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[GrowCap Cliente PWA] Service Worker activo, scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[GrowCap Cliente PWA] Error al registrar Service Worker:', err);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
