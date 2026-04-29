const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    absenteeTriggerTime: {
      type: String,
      default: '18:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);
