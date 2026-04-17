const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'employee'], required: true, index: true },
    email: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true, index: true },
    groupId: { type: mongoose.Schema.Types.Mixed },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
