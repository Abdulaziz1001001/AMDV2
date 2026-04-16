const mongoose = require('mongoose');

const EmployeeDocumentSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['id_copy', 'contract', 'certification', 'safety_training', 'medical', 'other'],
      default: 'other',
    },
    filename: { type: String, required: true },
    originalName: String,
    mimeType: String,
    size: Number,
    expiresAt: Date,
    uploadedBy: String,
    uploadedByRole: { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
    notes: String,
  },
  { timestamps: true },
);

EmployeeDocumentSchema.index({ employeeId: 1 });
EmployeeDocumentSchema.index({ expiresAt: 1 });

module.exports = mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', EmployeeDocumentSchema);
