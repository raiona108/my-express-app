import express from 'express';
import DailyEntry from '../models/DailyEntry.js';
import Habit from '../models/Habit.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Protect all daily entry routes with JWT middleware
router.use(authMiddleware);

// PATCH /api/dailyEntry/update - Toggle/update a habit for a specific date
// (Placed BEFORE the wildcard GET route so "/update" isn't treated as a date!)
router.patch('/update', async (req, res) => {
  try {
    const { habitId, date, completed } = req.body;

    let entry = await DailyEntry.findOne({ userId: req.user.id, date });

    // If no entry exists for this date yet, create one pre-filled with the user's habits
    if (!entry) {
      const userHabits = await Habit.find({ userId: req.user.id });
      entry = new DailyEntry({
        userId: req.user.id,
        date,
        habits: userHabits.map(h => ({
          habit: h._id,
          completed: h._id.toString() === habitId ? completed : false
        }))
      });
    } else {
      // Find the habit inside today's array and update it (or add it if newly created)
      const habitItem = entry.habits.find(item => item.habit.toString() === habitId);
      if (habitItem) {
        habitItem.completed = completed;
      } else {
        entry.habits.push({ habit: habitId, completed });
      }
    }

    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dailyEntry/:date (Handles both URL-encoded "26%2F11%2F2026" and raw "26/11/2026")
router.get('/*date', async (req, res) => {
  try {
    // Express 5 wildcard params come back as an array of segments (e.g. ['26', '11', '2026'])
    const rawDate = Array.isArray(req.params.date)
      ? req.params.date.join('/')
      : decodeURIComponent(req.params.date);

    let entry = await DailyEntry.findOne({ userId: req.user.id, date: rawDate });

    // If the user hasn't logged anything for this date yet, return a fresh default structure
    if (!entry) {
      const userHabits = await Habit.find({ userId: req.user.id });
      entry = await DailyEntry.create({
        userId: req.user.id,
        date: rawDate,
        habits: userHabits.map(h => ({
          habit: h._id,
          completed: false
        }))
      });
    }

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
