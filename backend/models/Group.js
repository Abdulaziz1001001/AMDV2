const mongoose = require('mongoose');
const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  desc: String,
  color: { type: String, default: '#C45A28' },
  weekendDays: { type: [Number], default: [] },
  ignoreCompanyHolidays: { type: Boolean, default: false },
  extraNonWorkDates: { type: [String], default: [] },
}, { timestamps: true });
module.exports = mongoose.models.Group || mongoose.model('Group', GroupSchema);
