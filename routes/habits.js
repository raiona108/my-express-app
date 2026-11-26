import express from 'express';
import Habit from '../models/Habit.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Protect all habit routes with JWT middleware
router.use(authMiddleware);

// GET /api/habits - Fetch all of the logged-in user's habits
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/habits/add - Create a new habit
router.post('/add', async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    const newHabit = await Habit.create({
      userId: req.user.id,
      name,
      description,
      icon
    });

    res.status(201).json(newHabit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/habits/update - Update an existing habit
router.patch('/update', async (req, res) => {
  try {
    const { id, name, description, icon } = req.body;

    const updatedHabit = await Habit.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { name, description, icon },
      { new: true } // Returns the updated document
    );

    if (!updatedHabit) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    res.json(updatedHabit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/habits/delete - Delete a habit
router.delete('/delete', async (req, res) => {
  try {
    const { habitId } = req.body;

    const deleted = await Habit.findOneAndDelete({
      _id: habitId,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
