const mongoose = require('mongoose');

const ChecklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    labelAr: { type: String, default: '' },
    done: { type: Boolean, default: false },
    doneAt: { type: Date },
    doneBy: { type: String },
  },
  { _id: true },
);

const OnboardingChecklistSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: { type: String, enum: ['onboarding', 'offboarding'], required: true },
    items: { type: [ChecklistItemSchema], default: [] },
    completedAt: { type: Date },
    createdBy: { type: String },
  },
  { timestamps: true },
);

OnboardingChecklistSchema.index({ employeeId: 1, type: 1 });

module.exports = mongoose.models.OnboardingChecklist || mongoose.model('OnboardingChecklist', OnboardingChecklistSchema);
