const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date: { type: String, required: true },
  checkIn: { type: String },
  checkInLat: { type: Number },
  checkInLng: { type: Number },
  checkOut: { type: String },
  checkOutLat: { type: Number },
  checkOutLng: { type: Number },
  status: { type: String, default: 'present' },
  notes: { type: String },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'none'], default: 'none' },
  isForgiven: { type: Boolean, default: false },
  attachment: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.Record || mongoose.model('Record', RecordSchema);
