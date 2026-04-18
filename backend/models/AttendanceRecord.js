const mongoose = require('mongoose');

const BreakEntrySchema = new mongoose.Schema(
  {
    start: { type: String, required: true },
    end: { type: String },
  },
  { _id: true }
);

const AttendanceRecordSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    checkIn: { type: String },
    checkInLat: { type: Number },
    checkInLng: { type: Number },
    checkOut: { type: String },
    checkOutLat: { type: Number },
    checkOutLng: { type: Number },
    status: { type: String, default: 'present', index: true },
    notes: { type: String },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'none'],
      default: 'none',
      index: true,
    },
    isForgiven: { type: Boolean, default: false },
    attachment: { type: String },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    locationName: { type: String },
    checkoutLocationName: { type: String },
    breaks: { type: [BreakEntrySchema], default: [] },
    overtimeMinutes: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'records' }
);

AttendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports =
  mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);
