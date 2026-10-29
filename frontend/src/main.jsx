import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global fetch interceptor to append JWT Bearer auth token to all /api requests
const originalFetch = window.fetch;
window.fetch = function (resource, init = {}) {
  const token = localStorage.getItem('pos_auth_token');
  if (token && typeof resource === 'string' && resource.startsWith('/api')) {
    init = init || {};
    init.headers = {
      ...(init.headers || {}),
      'Authorization': `Bearer ${token}`
    };
  }
  return originalFetch(resource, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
