const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  { date: { type: String, required: true }, nameEn: String, nameAr: String },
  { _id: false },
);

const ExcuseReasonSchema = new mongoose.Schema(
  { code: { type: String, required: true }, labelEn: String, labelAr: String },
  { _id: false },
);

const ApprovalChainStepSchema = new mongoose.Schema(
  { role: { type: String, required: true }, label: String, labelAr: String },
  { _id: false },
);

const ApprovalChainSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    steps: { type: [ApprovalChainStepSchema], default: [] },
  },
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
    annualLeaveDays: { type: Number, default: 30 },
    overtimeRateMultiplier: { type: Number, default: 1.5 },
    maxBreakMinutes: { type: Number, default: 60 },
    approvalChains: { type: [ApprovalChainSchema], default: [] },
    onboardingItems: { type: [String], default: ['ID Verification', 'Safety Orientation', 'PPE Issued', 'Contract Signed', 'Bank Details Collected'] },
    offboardingItems: { type: [String], default: ['Final Settlement', 'Asset Return', 'Access Revocation', 'Exit Interview'] },
  },
  { timestamps: true },
);

module.exports = mongoose.models.WorkPolicy || mongoose.model('WorkPolicy', WorkPolicySchema);
