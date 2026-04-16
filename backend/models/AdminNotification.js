const mongoose = require('mongoose');

const AdminNotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    titleAr: { type: String, default: '' },
    bodyAr: { type: String, default: '' },
    ref: {
      kind: { type: String, default: 'record' },
      id: { type: String, required: true },
    },
    recipientId: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

AdminNotificationSchema.index({ 'ref.id': 1 });
AdminNotificationSchema.index({ readAt: 1, createdAt: -1 });

module.exports =
  mongoose.models.AdminNotification || mongoose.model('AdminNotification', AdminNotificationSchema);
