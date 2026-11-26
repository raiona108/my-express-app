// public/js/login.js
redirectIfAuthenticated();

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageEl = document.getElementById('message');
const loginButton = document.getElementById('login-button');

async function handleLogin() {
  messageEl.textContent = '';

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    messageEl.textContent = 'Please enter both your email and password.';
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Invalid email or password.');
    }

    setToken(data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    messageEl.textContent = err.message;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Log in';
  }
}

loginButton.addEventListener('click', handleLogin);

// Allow submitting by pressing Enter in either field
[emailInput, passwordInput].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});
