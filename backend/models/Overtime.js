const mongoose = require('mongoose');

const OvertimeSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record' },
    date: { type: String, required: true },
    extraMinutes: { type: Number, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approvedAt: { type: Date },
    rateMultiplier: { type: Number, default: 1.5 },
  },
  { timestamps: true },
);

OvertimeSchema.index({ employeeId: 1, date: -1 });
OvertimeSchema.index({ status: 1 });

module.exports = mongoose.models.Overtime || mongoose.model('Overtime', OvertimeSchema);
