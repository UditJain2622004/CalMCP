import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/global.css';
import './styles/utilities.css';
import { cleanupExpiredDrafts } from './db/database';
import { seedDevData } from './db/seed';

// Initialize app
async function init() {
  // Cleanup expired drafts at startup (never removes confirmed meals)
  await cleanupExpiredDrafts();

  // Seed development data on first run
  if (import.meta.env.DEV) {
    await seedDevData();
  }
}

// Start initialization (non-blocking — app renders immediately)
init().catch(err => {
  console.warn('[Init] Startup initialization failed:', err);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
