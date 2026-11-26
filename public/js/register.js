// public/js/register.js
redirectIfAuthenticated();

const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const messageEl = document.getElementById('message');
const registerButton = document.getElementById('register-button');

async function handleRegister() {
  messageEl.textContent = '';

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!name || !email || !password || !confirmPassword) {
    messageEl.textContent = 'Please fill in all fields.';
    return;
  }

  if (password.length < 6) {
    messageEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  if (password !== confirmPassword) {
    messageEl.textContent = 'Passwords do not match.';
    return;
  }

  registerButton.disabled = true;
  registerButton.textContent = 'Creating account...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    setToken(data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    messageEl.textContent = err.message;
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = 'Create account';
  }
}

registerButton.addEventListener('click', handleRegister);

// Allow submitting by pressing Enter in any field
[nameInput, emailInput, passwordInput, confirmPasswordInput].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
});
