import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle dynamic import chunk failures after deployments or cache updates
window.addEventListener('vite:preloadError', (event) => {
  const reloadKey = 'tc_preload_reloaded';
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, 'true');
    window.location.reload();
  }
});

// Clear preload retry key once the page successfully settles
window.addEventListener('load', () => {
  setTimeout(() => {
    sessionStorage.removeItem('tc_preload_reloaded');
  }, 5000);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
