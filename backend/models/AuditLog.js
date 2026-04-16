const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true },
    actorRole: { type: String, default: '' },
    actorName: { type: String, default: '' },
    action: { type: String, required: true },
    target: { type: String, default: '' },
    targetId: { type: String, default: '' },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, default: '' },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actor: 1 });
AuditLogSchema.index({ action: 1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
