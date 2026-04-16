const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    color: { type: String, default: '#C45A28' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const ShiftAssignmentSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    date: { type: String, required: true },
  },
  { timestamps: true },
);

ShiftAssignmentSchema.index({ employeeId: 1, date: 1 }, { unique: true });
ShiftAssignmentSchema.index({ date: 1 });

const Shift = mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
const ShiftAssignment = mongoose.models.ShiftAssignment || mongoose.model('ShiftAssignment', ShiftAssignmentSchema);

module.exports = { Shift, ShiftAssignment };
