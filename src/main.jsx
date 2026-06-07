// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './store/index'
import App from './App.jsx'
import './index.css'

// Global fetch interceptor to inject namespaced super-admin token and target app header
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const isApi = typeof url === 'string' && (url.startsWith('/api') || url.includes('/api/'));
  if (isApi) {
    const token = localStorage.getItem('ksmcm_super_admin_token') || '';
    options.headers = {
      ...options.headers,
      'X-Client-Type': 'web',
      'X-Target-App': 'super-admin',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }
  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)