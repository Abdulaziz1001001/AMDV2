const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String, default: '' },
    body: { type: String, required: true },
    bodyAr: { type: String, default: '' },
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
    targetType: { type: String, enum: ['all', 'department', 'group'], default: 'all' },
    targetId: { type: String, default: '' },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: '' },
    expiresAt: { type: Date },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ expiresAt: 1 });

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
