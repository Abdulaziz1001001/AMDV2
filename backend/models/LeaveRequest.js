const mongoose = require('mongoose');

const LEAVE_TYPES = [
  'Sick Leave',
  'Annual Leave',
  'Unpaid Leave',
  'Emergency Leave',
  'Maternity/Paternity Leave',
  'Bereavement Leave',
  'Study Leave',
  'Hajj/Umrah Leave',
  'Marriage Leave',
  'Work Injury',
];

const ApprovalStepEntrySchema = new mongoose.Schema(
  {
    role: String,
    label: String,
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    actorName: String,
    action: { type: String, enum: ['approved', 'rejected'] },
    actionAt: Date,
  },
  { _id: false },
);

const LeaveRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: { type: String, required: true, enum: LEAVE_TYPES },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'supervisor_approved', 'hr_approved'], default: 'pending' },
  reason: { type: String },
  requestedDays: { type: Number, required: true },
  attachmentUrl: { type: String },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  approvedByRole: { type: String, enum: ['admin', 'manager'] },
  approvedAt: { type: Date },
  approvalLevel: { type: Number, default: 0 },
  approvalHistory: { type: [ApprovalStepEntrySchema], default: [] },
}, { timestamps: true });

const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);
LeaveRequest.LEAVE_TYPES = LEAVE_TYPES;

module.exports = LeaveRequest;
