const mongoose = require('mongoose');

const LeaveRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: { type: String, required: true }, // e.g., 'annual', 'sick', 'unpaid'
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reason: { type: String },
  requestedDays: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);
