import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./style.css";
// @ts-ignore - virtual import by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Register service worker for background notifications
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('App content updated. Please refresh.');
  },
  onOfflineReady() {
    console.log('App ready for offline use.');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
