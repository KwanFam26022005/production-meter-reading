import React from 'react';
import ReactDOM from 'react-dom/client';
import UserApp from './UserApp';
import '../../index.css';

// Register minimal static service worker in supported browser environments for PWA User Portal
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration errors gracefully
    });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <UserApp />
  </React.StrictMode>
);
