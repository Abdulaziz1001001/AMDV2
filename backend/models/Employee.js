const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  eid: String,
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String,
  phone: String,
  groupId: { type: mongoose.Schema.Types.Mixed },
  workStart: String,
  workEnd: String,
  salary: Number,
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  jobTitle: String,
  hireDate: Date,
  active: { type: Boolean, default: true },
  emergencyContact: { name: String, phone: String, relation: String },
  address: String,
  photoUrl: String,
  leaveBalance: { type: Number, default: 0 },
  lastAccrualDate: Date,
}, { timestamps: true });

module.exports = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
