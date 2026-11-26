import mongoose from 'mongoose';

const dailyEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Formatted as dd/mm/yyyy per DOCS.md
  habits: [
    {
      habit: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
      completed: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

export default mongoose.model('DailyEntry', dailyEntrySchema);
