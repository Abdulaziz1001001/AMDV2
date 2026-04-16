const mongoose = require('mongoose');

const EarlyCheckoutSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true },
    checkoutTime: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approvedAt: { type: Date },
  },
  { timestamps: true },
);

EarlyCheckoutSchema.index({ employeeId: 1, createdAt: -1 });
EarlyCheckoutSchema.index({ status: 1 });

module.exports =
  mongoose.models.EarlyCheckout || mongoose.model('EarlyCheckout', EarlyCheckoutSchema);
