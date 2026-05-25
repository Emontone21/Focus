import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Apply persisted theme before render to avoid flash
const savedTheme = localStorage.getItem('ff:theme');
if (savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia?.('(prefers-color-scheme: dark)').matches)) {
  document.body.classList.add('dark');
}

// Register service worker only in web context (not inside Capacitor file:// scheme)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
