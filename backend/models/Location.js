const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  groupId: { type: mongoose.Schema.Types.Mixed, required: true }, // Mixed تعني: اقبل أي نوع من البيانات سواء نص أو رقم
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, default: 500 }
});

module.exports = mongoose.models.Location || mongoose.model('Location', LocationSchema);
