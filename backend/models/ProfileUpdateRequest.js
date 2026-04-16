const mongoose = require('mongoose');

const ProfileUpdateRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    changes: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    reviewedAt: Date,
    reviewNote: String,
  },
  { timestamps: true },
);

ProfileUpdateRequestSchema.index({ employeeId: 1 });
ProfileUpdateRequestSchema.index({ status: 1 });

module.exports = mongoose.models.ProfileUpdateRequest || mongoose.model('ProfileUpdateRequest', ProfileUpdateRequestSchema);
