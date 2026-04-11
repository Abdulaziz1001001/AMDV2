const AdminNotification = require('../models/AdminNotification');
const Employee = require('../models/Employee');

async function upsertPendingLeaveNotification(record) {
  const rid = String(record._id);
  if (record.approvalStatus !== 'pending') return;

  let empName = 'Employee';
  try {
    const emp = await Employee.findById(record.employeeId);
    if (emp && emp.name) empName = emp.name;
  } catch (_) {
    /* ignore */
  }

  await AdminNotification.findOneAndUpdate(
    { 'ref.kind': 'record', 'ref.id': rid },
    {
      type: 'leave_pending',
      title: 'Leave / early departure request',
      titleAr: 'طلب استئذان أو انصراف مبكر',
      body: `${empName} — ${record.date}`,
      bodyAr: `${empName} — ${record.date}`,
      ref: { kind: 'record', id: rid },
      readAt: null,
    },
    { upsert: true, new: true },
  );
}

async function markNotificationsReadForRecord(recordId) {
  await AdminNotification.updateMany(
    { 'ref.kind': 'record', 'ref.id': String(recordId) },
    { $set: { readAt: new Date() } },
  );
}

module.exports = { upsertPendingLeaveNotification, markNotificationsReadForRecord };
