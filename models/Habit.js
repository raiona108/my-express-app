import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: ''},
    icon: { type: String, default: '✅' }
}, { timestamps: true });

export default mongoose.model('Habit', habitSchema);