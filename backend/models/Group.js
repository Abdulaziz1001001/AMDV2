const mongoose = require('mongoose');
const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  desc: String,
  color: { type: String, default: '#C45A28' }
});
module.exports = mongoose.models.Group || mongoose.model('Group', GroupSchema);
