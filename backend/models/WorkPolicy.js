const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  { date: { type: String, required: true }, nameEn: String, nameAr: String },
  { _id: false },
);

const ExcuseReasonSchema = new mongoose.Schema(
  { code: { type: String, required: true }, labelEn: String, labelAr: String },
  { _id: false },
);

const WorkPolicySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'company' },
    timeZone: { type: String, default: 'Asia/Riyadh' },
    defaultWeekendDays: { type: [Number], default: [5, 6] },
    companyHolidays: { type: [HolidaySchema], default: [] },
    lateGraceMinutes: { type: Number, default: 15 },
    excuseReasons: { type: [ExcuseReasonSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.models.WorkPolicy || mongoose.model('WorkPolicy', WorkPolicySchema);
