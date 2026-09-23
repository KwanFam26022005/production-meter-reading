import React from 'react';
import ReactDOM from 'react-dom/client';
import OperationsApp from './OperationsApp';
import '../../index.css';

// Operations Portal is a desktop-first administrative workspace:
// Service Worker is deliberately NOT registered here to avoid unnecessary PWA shell caching.

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <OperationsApp />
  </React.StrictMode>
);
