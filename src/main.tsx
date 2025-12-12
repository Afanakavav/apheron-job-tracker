import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import './i18n/i18n' // Initialize i18n

// Error boundary for unhandled errors
window.addEventListener('error', (event) => {
  console.error('❌ Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  // Register immediately, don't wait for load event
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      console.log('✅ Service Worker registered:', registration);
      
      // Force update check on every page load
      registration.update();
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, prompt user to refresh
              console.log('🔄 New service worker available');
            }
          });
        }
      });
    })
    .catch((registrationError) => {
      console.log('❌ Service Worker registration failed:', registrationError);
    });
}

// Request notification permission on app load
if ('Notification' in window && Notification.permission === 'default') {
  // Don't request immediately, wait for user interaction
  // This will be handled in the Calendar component
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)


