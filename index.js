import express from 'express';

const app = express();
const PORT = 3000;

// Lets Express read JSON data sent in req.body
app.use(express.json());

// Temporary storage (resets when server restarts)
let habits = [
  { id: 1, title: 'Drink 2L of water', completed: false },
  { id: 2, title: 'Code for 30 minutes', completed: true }
];

// 1. READ: Get all habits
app.get('/habits', (req, res) => {
  res.json(habits);
});

// 2. CREATE: Add a new habit
app.post('/habits', (req, res) => {
  const newHabit = {
    id: Date.now(), // Quick way to make a unique ID
    title: req.body.title,
    completed: false
  };
  habits.push(newHabit);
  res.status(201).json(newHabit);
});

// 3. UPDATE: Toggle completed status
app.patch('/habits/:id', (req, res) => {
  const habitId = Number(req.params.id);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  habit.completed = !habit.completed;
  res.json(habit);
});

// 4. DELETE: Remove a habit
app.delete('/habits/:id', (req, res) => {
  const habitId = Number(req.params.id);
  habits = habits.filter(h => h.id !== habitId);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Habit Tracker running at http://localhost:${PORT}`);
});
