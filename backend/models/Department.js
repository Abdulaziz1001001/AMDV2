const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

module.exports = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
