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

async function upsertActivityNotification(record, action) {
  const rid = String(record._id);
  let empName = 'Employee';
  try {
    const emp = await Employee.findById(record.employeeId);
    if (emp && emp.name) empName = emp.name;
  } catch (_) {}

  let title = 'Activity Recorded';
  let titleAr = 'تسجيل نشاط';
  if (action === 'checkin') {
    title = 'Check In Recorded';
    titleAr = 'تسجيل حضور';
  } else if (action === 'checkout') {
    title = 'Check Out Recorded';
    titleAr = 'تسجيل انصراف';
  } else if (action === 'leave') {
    title = 'Leave Request Submitted';
    titleAr = 'تم تقديم طلب استئذان';
  }

  await AdminNotification.create({
    type: 'activity_' + action,
    title,
    titleAr,
    body: `${empName} — ${record.date}`,
    bodyAr: `${empName} — ${record.date}`,
    ref: { kind: 'record', id: rid },
    readAt: null,
  });
}

async function markNotificationsReadForRecord(recordId) {
  await AdminNotification.updateMany(
    { 'ref.kind': 'record', 'ref.id': String(recordId) },
    { $set: { readAt: new Date() } },
  );
}

module.exports = { upsertPendingLeaveNotification, upsertActivityNotification, markNotificationsReadForRecord };
