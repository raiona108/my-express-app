// public/js/auth.js
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

// Redirect to dashboard if already logged in (for login.html and register.html)
function redirectIfAuthenticated() {
  if (getToken()) {
    window.location.href = '/dashboard.html';
  }
}

// Redirect to login if not logged in (for dashboard.html)
function requireAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}

// Helper for authenticated API requests
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login.html';
    return null;
  }

  return response;
}
