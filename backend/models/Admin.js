const mongoose = require('mongoose');
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: String
});
module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
