const mongoose = require('mongoose');

const SafetyIncidentSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    reporterName: String,
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    date: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'closed'], default: 'open' },
    photos: [String],
    location: String,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    resolvedAt: Date,
    resolution: String,
  },
  { timestamps: true },
);

SafetyIncidentSchema.index({ status: 1 });
SafetyIncidentSchema.index({ projectId: 1 });
SafetyIncidentSchema.index({ reporterId: 1 });

module.exports = mongoose.models.SafetyIncident || mongoose.model('SafetyIncident', SafetyIncidentSchema);
