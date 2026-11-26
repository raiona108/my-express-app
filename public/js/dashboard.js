// public/js/dashboard.js
requireAuth();

let habits = [];
let dailyHabits = [];
let editingHabitId = null;

function toInputDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(yyyyMmDd) {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toApiDate(yyyyMmDd) {
  const [year, month, day] = yyyyMmDd.split('-');
  return `${day}/${month}/${year}`;
}

const todayStr = toInputDate(new Date());
let selectedDate = todayStr;

const dateSelector = document.getElementById('date-selector');
const weekDatesEl = document.getElementById('week-dates');
const habitList = document.getElementById('habit-list');
const loadingIndicator = document.getElementById('loading-indicator');
const messageEl = document.getElementById('message');

const progressCircle = document.getElementById('progress-circle');
const progressPercentEl = document.getElementById('progress-percent');

const habitModal = document.getElementById('habit-modal');
const modalTitle = document.getElementById('modal-title');
const habitNameInput = document.getElementById('habit-name');
const habitDescriptionInput = document.getElementById('habit-description');
const habitIconInput = document.getElementById('habit-icon');

const profileModal = document.getElementById('profile-modal');
const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');

dateSelector.max = todayStr;
dateSelector.value = todayStr;

function renderWeekDates() {
  weekDatesEl.innerHTML = '';
  const baseDate = parseInputDate(selectedDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let offset = -4; offset <= 0; offset++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + offset);
    const dStr = toInputDate(d);
    if (dStr > todayStr) continue;

    const isSelected = dStr === selectedDate;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `flex flex-col items-center justify-center rounded-xl border p-2 text-xs font-semibold transition cursor-pointer ${
      isSelected
        ? 'border-primary bg-primary text-black shadow-md'
        : 'border-surface bg-surface/50 text-foreground hover:brightness-110'
    }`;

    btn.innerHTML = `
      <span class="opacity-75">${dayNames[d.getDay()]}</span>
      <span class="mt-1 text-base font-bold">${d.getDate()}</span>
    `;

    btn.addEventListener('click', () => changeDate(dStr));
    weekDatesEl.appendChild(btn);
  }
}

async function changeDate(newDate) {
  if (!newDate || newDate > todayStr) {
    dateSelector.value = selectedDate;
    return;
  }
  selectedDate = newDate;
  dateSelector.value = selectedDate;
  renderWeekDates();
  await loadDailyProgress();
}

async function initDashboard() {
  try {
    const [meRes, habitsRes] = await Promise.all([
      apiFetch('/auth/me'),
      apiFetch('/habits')
    ]);

    if (!meRes || !habitsRes) return;

    const meData = await meRes.json();
    if (meData.user) {
      if (profileNameInput) profileNameInput.value = meData.user.name || '';
      if (profileEmailInput) profileEmailInput.value = meData.user.email || '';
    }

    habits = await habitsRes.json();
    renderWeekDates();
    await loadDailyProgress();
  } catch (err) {
    console.error(err);
    messageEl.textContent = 'Failed to load dashboard data.';
  } finally {
    loadingIndicator.classList.add('hidden');
  }
}

async function loadDailyProgress() {
  messageEl.textContent = '';
  try {
    const apiDate = toApiDate(selectedDate);
    const entryRes = await apiFetch(`/dailyEntry/${encodeURIComponent(apiDate)}`);
    if (!entryRes) return;

    const entryData = await entryRes.json();
    dailyHabits = entryData.habits || [];
    renderHabits();
  } catch (err) {
    console.error(err);
    messageEl.textContent = 'Failed to load daily progress.';
  }
}
function renderHabits() {
  habitList.innerHTML = '';

  if (habits.length === 0) {
    habitList.innerHTML = `
      <p class="rounded-xl border border-surface p-6 text-center text-sm opacity-75">
        No habits yet. Click <strong>+ Add Habit</strong> to create one.
      </p>
    `;
    updateProgressUI(0, 0);
    return;
  }

  let completedCount = 0;

  habits.forEach((habit) => {
    const entryItem = dailyHabits.find((item) => item.habit === habit._id);
    const isCompleted = entryItem ? entryItem.completed : false;
    if (isCompleted) completedCount++;

    const card = document.createElement('div');
    card.className = `flex items-center justify-between gap-4 rounded-xl border p-4 transition ${
      isCompleted
        ? 'border-primary bg-surface/80'
        : 'border-surface bg-surface/30 hover:border-primary/50'
    }`;

    const leftGroup = document.createElement('div');
    leftGroup.className = 'flex items-center gap-3';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isCompleted;
    checkbox.className = 'h-5 w-5 accent-primary cursor-pointer';
    checkbox.addEventListener('change', () => toggleHabitCompletion(habit._id, checkbox.checked));

    const iconSpan = document.createElement('span');
    iconSpan.className = 'text-2xl select-none';
    iconSpan.textContent = habit.icon || '✅';

    const textWrapper = document.createElement('div');
    const title = document.createElement('h3');
    title.className = `font-bold ${isCompleted ? 'line-through opacity-60' : ''}`;
    title.textContent = habit.name;
    textWrapper.appendChild(title);

    if (habit.description) {
      const desc = document.createElement('p');
      desc.className = 'text-xs opacity-75';
      desc.textContent = habit.description;
      textWrapper.appendChild(desc);
    }

    leftGroup.append(checkbox, iconSpan, textWrapper);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'flex items-center gap-2';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'rounded-lg border border-surface px-2.5 py-1 text-xs font-semibold hover:brightness-110 cursor-pointer';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEditHabitModal(habit));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteHabit(habit._id));

    rightGroup.append(editBtn, deleteBtn);
    card.append(leftGroup, rightGroup);
    habitList.appendChild(card);
  });

  updateProgressUI(completedCount, habits.length);
}

function updateProgressUI(completed, total) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressPercentEl.textContent = `${percent}%`;
  progressCircle.setAttribute('aria-valuenow', String(percent));
  progressCircle.style.background = `conic-gradient(var(--color-primary, #f59e0b) ${percent * 3.6}deg, var(--color-surface, #334155) 0deg)`;
}

async function toggleHabitCompletion(habitId, completed) {
  try {
    const res = await apiFetch('/dailyEntry/update', {
      method: 'PATCH',
      body: JSON.stringify({
        habitId,
        date: toApiDate(selectedDate),
        completed
      })
    });

    if (!res || !res.ok) return;
    const updatedEntry = await res.json();
    dailyHabits = updatedEntry.habits || [];
    renderHabits();

    const allDone = habits.length > 0 && habits.every((h) => {
      const found = dailyHabits.find((item) => item.habit === h._id);
      return found && found.completed;
    });

    if (completed && allDone && typeof window.confetti === 'function') {
      window.confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }
  } catch (err) {
    console.error(err);
    messageEl.textContent = 'Could not update habit progress.';
  }
}

function openAddHabitModal() {
  editingHabitId = null;
  modalTitle.textContent = 'Add Habit';
  habitNameInput.value = '';
  habitDescriptionInput.value = '';
  habitIconInput.value = '✅';
  habitModal.classList.remove('hidden');
  habitModal.style.display = 'flex';
}

function openEditHabitModal(habit) {
  editingHabitId = habit._id;
  modalTitle.textContent = 'Edit Habit';
  habitNameInput.value = habit.name;
  habitDescriptionInput.value = habit.description || '';
  habitIconInput.value = habit.icon || '✅';
  habitModal.classList.remove('hidden');
  habitModal.style.display = 'flex';
}

function openProfileModal() {
  profileModal.classList.remove('hidden');
  profileModal.style.display = 'flex';
}

function closeModals() {
  habitModal.classList.add('hidden');
  habitModal.style.display = 'none';
  profileModal.classList.add('hidden');
  profileModal.style.display = 'none';
}

async function handleSaveHabit() {
  const name = habitNameInput.value.trim();
  const description = habitDescriptionInput.value.trim();
  const icon = habitIconInput.value.trim() || '✅';

  if (!name) return;

  try {
    if (editingHabitId) {
      const res = await apiFetch('/habits/update', {
        method: 'PATCH',
        body: JSON.stringify({ id: editingHabitId, name, description, icon })
      });
      if (res && res.ok) {
        const updated = await res.json();
        habits = habits.map((h) => (h._id === editingHabitId ? updated : h));
      }
    } else {
      const res = await apiFetch('/habits/add', {
        method: 'POST',
        body: JSON.stringify({ name, description, icon })
      });
      if (res && res.ok) {
        const created = await res.json();
        habits.push(created);
      }
    }

    closeModals();
    renderHabits();
  } catch (err) {
    console.error(err);
    messageEl.textContent = 'Failed to save habit.';
  }
}

async function deleteHabit(habitId) {
  try {
    const res = await apiFetch('/habits/delete', {
      method: 'DELETE',
      body: JSON.stringify({ habitId })
    });

    if (res && res.ok) {
      habits = habits.filter((h) => h._id !== habitId);
      renderHabits();
    }
  } catch (err) {
    console.error(err);
    messageEl.textContent = 'Failed to delete habit.';
  }
}

// Universal click handler (works regardless of button IDs or HTML nesting)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) {
    const label = btn.textContent.trim().toLowerCase();
    if (label === 'cancel') closeModals();
    if (label.includes('save habit')) handleSaveHabit();
  }
  if (e.target === habitModal || e.target === profileModal) {
    closeModals();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModals();
});

document.getElementById('add-habit-button').addEventListener('click', openAddHabitModal);
document.getElementById('profile-button').addEventListener('click', openProfileModal);
document.getElementById('logout-button')?.addEventListener('click', () => {
  clearToken();
  window.location.href = '/login.html';
});

dateSelector.addEventListener('change', () => changeDate(dateSelector.value));

document.querySelectorAll('.icon-choice').forEach((btn) => {
  btn.addEventListener('click', () => {
    habitIconInput.value = btn.textContent.trim();
  });
});


initDashboard();
