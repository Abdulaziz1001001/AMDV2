const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  /** @deprecated Prefer allowedGroups; kept for backward compatibility */
  groupId: { type: mongoose.Schema.Types.Mixed },
  /** Empty array = open to all groups for check-in authorization */
  allowedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, default: 500 },
});

module.exports = mongoose.models.Location || mongoose.model('Location', LocationSchema);
