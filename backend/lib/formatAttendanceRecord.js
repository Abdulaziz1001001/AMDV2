const mongoose = require('mongoose');

/**
 * JSON-safe attendance row: employeeId always a string id (stable API contract after populate).
 */
function formatAttendanceRecord(doc) {
  const o = doc.toObject ? doc.toObject({ virtuals: false }) : { ...doc };
  const eidVal = o.employeeId;
  if (eidVal != null && typeof eidVal === 'object' && !(eidVal instanceof mongoose.Types.ObjectId)) {
    const id = eidVal._id != null ? String(eidVal._id) : '';
    o.employeeId = id;
  } else if (eidVal != null) {
    o.employeeId = String(eidVal);
  }
  o.id = doc._id ? doc._id.toString() : String(o._id || '');
  delete o._id;
  delete o.__v;
  return o;
}

function formatAttendanceRecords(docs) {
  return docs.map((d) => formatAttendanceRecord(d));
}

module.exports = { formatAttendanceRecord, formatAttendanceRecords };
