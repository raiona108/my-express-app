let isRegisterMode = false;
let token = localStorage.getItem('token');

// Helper: Format today's date as dd/mm/yyyy (per DOCS.md)
function getTodayFormatted() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

const todayDate = getTodayFormatted();

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const nameField = document.getElementById('name-field');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleBtn = document.getElementById('auth-toggle-btn');

// Toggle between Login and Register modes
authToggleBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authError.classList.add('hidden');
  nameField.classList.toggle('hidden', !isRegisterMode);
  authSubtitle.textContent = isRegisterMode
    ? 'Create an account to start building habits'
    : 'Sign in to track your daily progress';
  authSubmitBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
  authToggleText.textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
  authToggleBtn.textContent = isRegisterMode ? 'Sign In' : 'Register';
});

// Handle Login / Register Submit
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');

  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();

  const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
  const payload = isRegisterMode ? { name, email, password } : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    token = data.token;
    localStorage.setItem('token', token);
    showDashboard(data.user);
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  token = null;
  dashboardSection.classList.add('hidden');
  authSection.classList.remove('hidden');
});

// Initialize app if token already exists
async function initApp() {
  if (!token) return;

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error('Session expired');
    const data = await res.json();
    showDashboard(data.user);
  } catch {
    localStorage.removeItem('token');
    token = null;
  }
}

// Show Dashboard and load habits + daily entries
async function showDashboard(user) {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('today-date').textContent = todayDate;

  await loadHabitsAndProgress();
}

async function loadHabitsAndProgress() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Fetch user's habits and today's daily entry in parallel
    const [habitsRes, entryRes] = await Promise.all([
      fetch('/api/habits', { headers }),
      fetch(`/api/dailyEntry/${encodeURIComponent(todayDate)}`, { headers })
    ]);

    const habits = await habitsRes.json();
    const dailyEntry = await entryRes.json();

    renderHabits(habits, dailyEntry.habits || []);
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

function renderHabits(habits, dailyHabits) {
  const listEl = document.getElementById('habits-list');
  const emptyEl = document.getElementById('empty-state');
  listEl.innerHTML = '';

  if (habits.length === 0) {
    emptyEl.classList.remove('hidden');
    updateProgressBar(0, 0);
    return;
  }

  emptyEl.classList.add('hidden');
  let completedCount = 0;

  habits.forEach((habit) => {
    const entryItem = dailyHabits.find((item) => item.habit === habit._id);
    const isCompleted = entryItem ? entryItem.completed : false;
    if (isCompleted) completedCount++;

    const card = document.createElement('div');
    card.className = `flex items-center justify-between p-4 rounded-xl border transition ${
      isCompleted
        ? 'bg-slate-900/60 border-indigo-500/40'
        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
    }`;

    card.innerHTML = `
      <div class="flex items-center gap-4">
        <input type="checkbox" ${isCompleted ? 'checked' : ''}
          class="w-5 h-5 accent-indigo-500 rounded cursor-pointer" />
        <span class="text-2xl">${habit.icon || '✅'}</span>
        <div>
          <h3 class="font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-100'}">
            ${habit.name}
          </h3>
          ${habit.description ? `<p class="text-xs text-slate-400">${habit.description}</p>` : ''}
        </div>
      </div>
      <button class="delete-btn text-slate-500 hover:text-red-400 text-sm px-2 py-1 rounded transition cursor-pointer" title="Delete habit">
        ✕
      </button>
    `;

    // Toggle habit completion for today
    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', async () => {
      await toggleHabit(habit._id, checkbox.checked);
    });

    // Delete habit
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      await deleteHabit(habit._id);
    });

    listEl.appendChild(card);
  });

  updateProgressBar(completedCount, habits.length);
}

function updateProgressBar(completed, total) {
  const textEl = document.getElementById('progress-text');
  const barEl = document.getElementById('progress-bar');
  textEl.textContent = `${completed} / ${total} completed`;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  barEl.style.width = `${percent}%`;
}

// Add a new habit
document.getElementById('add-habit-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const icon = document.getElementById('habit-icon').value.trim() || '✅';
  const name = document.getElementById('habit-name').value.trim();
  const description = document.getElementById('habit-desc').value.trim();

  if (!name) return;

  await fetch('/api/habits/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, description, icon })
  });

  document.getElementById('habit-name').value = '';
  document.getElementById('habit-desc').value = '';
  await loadHabitsAndProgress();
});

// Toggle daily completion
async function toggleHabit(habitId, completed) {
  await fetch('/api/dailyEntry/update', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ habitId, date: todayDate, completed })
  });

  await loadHabitsAndProgress();
}

// Delete a habit
async function deleteHabit(habitId) {
  await fetch('/api/habits/delete', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ habitId })
  });

  await loadHabitsAndProgress();
}

initApp();
