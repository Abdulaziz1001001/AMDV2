const express = require('express');
const auth = require('../middleware/authMiddleware');
const Overtime = require('../models/Overtime');
const Record = require('../models/Record');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const AdminNotification = require('../models/AdminNotification');
const WorkPolicy = require('../models/WorkPolicy');

const router = express.Router();
router.use(auth);

function fmt(arr) {
  return arr.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    obj.id = obj._id.toString();
    return obj;
  });
}

router.post('/', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const { date, extraMinutes, reason, attendanceId } = req.body;
    if (!date || !extraMinutes || extraMinutes <= 0) {
      return res.status(400).json({ msg: 'date and positive extraMinutes are required' });
    }

    const existing = await Overtime.findOne({ employeeId: req.user.id, date });
    if (existing) return res.status(400).json({ msg: 'Overtime already logged for this date' });

    const policy = await WorkPolicy.findOne({ key: 'company' });
    const ot = new Overtime({
      employeeId: req.user.id,
      attendanceId: attendanceId || undefined,
      date,
      extraMinutes,
      reason: (reason || '').trim(),
      rateMultiplier: policy ? policy.overtimeRateMultiplier || 1.5 : 1.5,
    });
    await ot.save();

    if (attendanceId) {
      await Record.findByIdAndUpdate(attendanceId, { overtimeMinutes: extraMinutes });
    }

    const emp = await Employee.findById(req.user.id);
    await AdminNotification.create({
      type: 'overtime_pending',
      title: 'Overtime Request',
      titleAr: 'طلب عمل إضافي',
      body: `${emp ? emp.name : 'Employee'} logged ${extraMinutes} min overtime on ${date}.`,
      bodyAr: `${emp ? emp.name : 'موظف'} سجل ${extraMinutes} دقيقة عمل إضافي في ${date}.`,
      ref: { kind: 'overtime', id: ot._id.toString() },
    });

    res.json({ msg: 'Overtime submitted', overtime: ot });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const items = await Overtime.find().sort({ createdAt: -1 })
        .populate('employeeId', 'name eid')
        .populate('approvedBy', 'name');
      return res.json(fmt(items));
    }
    if (req.user.role === 'manager') {
      const dept = await Department.findOne({ managerId: req.user.id });
      if (dept) {
        const emps = await Employee.find({ departmentId: dept._id });
        const ids = emps.map((e) => e._id);
        const items = await Overtime.find({ employeeId: { $in: ids } }).sort({ createdAt: -1 })
          .populate('employeeId', 'name eid').populate('approvedBy', 'name');
        return res.json(fmt(items));
      }
    }
    const items = await Overtime.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
    res.json(fmt(items));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put('/:id/action', auth.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ msg: 'Status must be approved or declined' });
    }
    const ot = await Overtime.findById(req.params.id);
    if (!ot) return res.status(404).json({ msg: 'Not found' });
    if (ot.status !== 'pending') return res.status(400).json({ msg: 'Already processed' });

    ot.status = status;
    ot.approvedBy = req.user.id;
    ot.approvedAt = new Date();
    await ot.save();

    const approver = await Employee.findById(req.user.id);
    await AdminNotification.create({
      type: status === 'approved' ? 'overtime_approved' : 'overtime_declined',
      title: status === 'approved' ? 'Overtime Approved' : 'Overtime Declined',
      titleAr: status === 'approved' ? 'تمت الموافقة على العمل الإضافي' : 'تم رفض العمل الإضافي',
      body: `${approver ? approver.name : 'Admin'} ${status} your overtime request for ${ot.date}.`,
      bodyAr: `${approver ? approver.name : 'المدير'} ${status === 'approved' ? 'وافق على' : 'رفض'} طلب العمل الإضافي في ${ot.date}.`,
      ref: { kind: 'overtime', id: ot._id.toString() },
      recipientId: String(ot.employeeId),
    });

    res.json({ msg: 'Success', overtime: ot });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
