const mongoose = require('mongoose');

/** Stable employee id string from a Record doc (employeeId ObjectId or populated Employee). */
function recordEmployeeKey(r) {
  const v = r.employeeId;
  if (v instanceof mongoose.Types.ObjectId) return String(v);
  if (v != null && typeof v === 'object' && v._id != null) return String(v._id);
  return String(v);
}

module.exports = { recordEmployeeKey };
