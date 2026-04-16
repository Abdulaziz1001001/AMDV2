const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    address: { type: String },
    groupId: { type: mongoose.Schema.Types.Mixed },
    lat: { type: Number },
    lng: { type: Number },
    radius: { type: Number, default: 500 },
    status: { type: String, enum: ['active', 'completed', 'on_hold'], default: 'active' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    startDate: { type: Date },
    expectedEnd: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
