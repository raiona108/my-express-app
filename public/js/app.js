let isRegisterMode = false;
let token = localStorage.getItem('token');
let currentDateObj = new Date();

function formatDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function isToday(dateObj) {
  return formatDate(dateObj) === formatDate(new Date());
}

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const nameField = document.getElementById('name-field');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleBtn = document.getElementById('auth-toggle-btn');

const selectedDateEl = document.getElementById('selected-date');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const todayBtn = document.getElementById('today-btn');
const progressLabelEl = document.getElementById('progress-label');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-habit-form');

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
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    token = data.token;
    localStorage.setItem('token', token);
    showDashboard(data.user);
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  token = null;
  dashboardSection.classList.add('hidden');
  authSection.classList.remove('hidden');
});

prevDayBtn.addEventListener('click', async () => {
  currentDateObj.setDate(currentDateObj.getDate() - 1);
  updateDateHeader();
  await loadHabitsAndProgress();
});

nextDayBtn.addEventListener('click', async () => {
  if (isToday(currentDateObj)) return;
  currentDateObj.setDate(currentDateObj.getDate() + 1);
  updateDateHeader();
  await loadHabitsAndProgress();
});

todayBtn.addEventListener('click', async () => {
  currentDateObj = new Date();
  updateDateHeader();
  await loadHabitsAndProgress();
});

function updateDateHeader() {
  const formatted = formatDate(currentDateObj);
  const viewingToday = isToday(currentDateObj);

  selectedDateEl.textContent = viewingToday ? `Today (${formatted})` : formatted;
  progressLabelEl.textContent = viewingToday ? "Today's Progress" : `Progress for ${formatted}`;

  todayBtn.classList.toggle('hidden', viewingToday);
  nextDayBtn.disabled = viewingToday;
  nextDayBtn.classList.toggle('opacity-30', viewingToday);
  nextDayBtn.classList.toggle('cursor-not-allowed', viewingToday);
}

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

async function showDashboard(user) {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  document.getElementById('user-name').textContent = user.name;
  updateDateHeader();

  await loadHabitsAndProgress();
}

async function loadHabitsAndProgress() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    const dateStr = formatDate(currentDateObj);

    const [habitsRes, entryRes] = await Promise.all([
      fetch('/api/habits', { headers }),
      fetch(`/api/dailyEntry/${encodeURIComponent(dateStr)}`, { headers })
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

    const leftDiv = document.createElement('div');
    leftDiv.className = 'flex items-center gap-4';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isCompleted;
    checkbox.className = 'w-5 h-5 accent-indigo-500 rounded cursor-pointer';
    checkbox.addEventListener('change', async () => {
      await toggleHabit(habit._id, checkbox.checked);
    });

    const iconSpan = document.createElement('span');
    iconSpan.className = 'text-2xl';
    iconSpan.textContent = habit.icon || '✅';

    const textDiv = document.createElement('div');
    const titleEl = document.createElement('h3');
    titleEl.className = `font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-100'}`;
    titleEl.textContent = habit.name;
    textDiv.appendChild(titleEl);

    if (habit.description) {
      const descEl = document.createElement('p');
      descEl.className = 'text-xs text-slate-400';
      descEl.textContent = habit.description;
      textDiv.appendChild(descEl);
    }

    leftDiv.append(checkbox, iconSpan, textDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex items-center gap-1';

    const editBtn = document.createElement('button');
    editBtn.className = 'text-slate-400 hover:text-indigo-400 text-sm px-2.5 py-1 rounded transition cursor-pointer';
    editBtn.title = 'Edit habit';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => openEditModal(habit));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-slate-400 hover:text-red-400 text-sm px-2.5 py-1 rounded transition cursor-pointer';
    deleteBtn.title = 'Delete habit';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', async () => {
      await deleteHabit(habit._id);
    });

    actionsDiv.append(editBtn, deleteBtn);
    card.append(leftDiv, actionsDiv);
    listEl.appendChild(card);
  });

  updateProgressBar(completedCount, habits.length);
}

function updateProgressBar(completed, total) {
  const textEl = document.getElementById('progress-text');
  const barEl = document.getElementById('progress-bar');
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (textEl) textEl.textContent = `${completed} / ${total} completed (${percent}%)`;
  if (barEl) barEl.style.width = `${percent}%`;
}

function openEditModal(habit) {
  document.getElementById('edit-habit-id').value = habit._id;
  document.getElementById('edit-habit-icon').value = habit.icon || '✅';
  document.getElementById('edit-habit-name').value = habit.name;
  document.getElementById('edit-habit-desc').value = habit.description || '';
  editModal.classList.remove('hidden');
}

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  editModal.classList.add('hidden');
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('edit-habit-id').value;
  const icon = document.getElementById('edit-habit-icon').value.trim() || '✅';
  const name = document.getElementById('edit-habit-name').value.trim();
  const description = document.getElementById('edit-habit-desc').value.trim();
  if (!name) return;

  try {
    await fetch('/api/habits/update', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id, name, description, icon })
    });

    editModal.classList.add('hidden');
    await loadHabitsAndProgress();
  } catch (err) {
    console.error('Error updating habit:', err);
  }
});

document.getElementById('add-habit-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const icon = document.getElementById('habit-icon').value.trim() || '✅';
  const name = document.getElementById('habit-name').value.trim();
  const description = document.getElementById('habit-desc').value.trim();
  if (!name) return;

  try {
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
  } catch (err) {
    console.error('Error adding habit:', err);
  }
});

async function toggleHabit(habitId, completed) {
  try {
    await fetch('/api/dailyEntry/update', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        habitId,
        date: formatDate(currentDateObj),
        completed
      })
    });
    await loadHabitsAndProgress();
  } catch (err) {
    console.error('Error toggling habit:', err);
  }
}

async function deleteHabit(habitId) {
  try {
    await fetch('/api/habits/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ habitId })
    });
    await loadHabitsAndProgress();
  } catch (err) {
    console.error('Error deleting habit:', err);
  }
}

initApp();
