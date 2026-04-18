const express = require('express');
const auth = require('../middleware/authMiddleware');
const Record = require('../models/Record');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const EarlyCheckout = require('../models/EarlyCheckout');
const AdminNotification = require('../models/AdminNotification');

const router = express.Router();
router.use(auth);

/** Calendar date in Asia/Riyadh — must match employee portal `todayStr()` and Record.date */
function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

router.post('/early', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ msg: 'Reason is required' });
    }

    const date = todayStr();
    const record = await Record.findOne({ employeeId: String(req.user.id), date });
    if (!record) return res.status(400).json({ msg: 'No check-in record found for today' });
    if (record.checkOut) return res.status(400).json({ msg: 'Already checked out today' });

    const pendingEc = await EarlyCheckout.findOne({ attendanceId: record._id, status: 'pending' });
    if (pendingEc) {
      return res.status(400).json({ msg: 'You already have a pending early checkout request for today' });
    }

    const now = new Date();
    const earlyCheckout = new EarlyCheckout({
      employeeId: req.user.id,
      attendanceId: record._id,
      checkoutTime: now,
      reason: reason.trim(),
      status: 'pending',
    });
    await earlyCheckout.save();

    const emp = await Employee.findById(req.user.id);
    const empName = emp ? emp.name : 'Employee';

    await AdminNotification.create({
      type: 'early_checkout_pending',
      title: 'Early checkout request',
      titleAr: 'طلب انصراف مبكر',
      body: `${empName} requests early checkout — ${date}. Reason: ${reason.trim()}`,
      bodyAr: `${empName} يطلب انصراف مبكر — ${date}. السبب: ${reason.trim()}`,
      ref: { kind: 'early_checkout', id: earlyCheckout._id.toString() },
    });

    res.json({ msg: 'Early checkout submitted', earlyCheckout });
  } catch (err) {
    console.error('Early checkout POST error:', err);
    res.status(500).json({ msg: err.message });
  }
});

router.get('/early', async (req, res) => {
  try {
    const format = (arr) => arr.map((doc) => {
      const obj = doc.toObject ? doc.toObject() : doc;
      obj.id = obj._id.toString();
      return obj;
    });

    if (req.user.role === 'admin') {
      const items = await EarlyCheckout.find()
        .sort({ createdAt: -1 })
        .populate('employeeId', 'name eid')
        .populate('attendanceId', 'date checkIn checkOut status')
        .populate('approvedBy', 'name');
      return res.json(format(items));
    }

    if (req.user.role === 'manager') {
      const dept = await Department.findOne({ managerId: req.user.id });
      if (dept) {
        const emps = await Employee.find({ departmentId: dept._id });
        const empIds = emps.map((e) => e._id);
        const items = await EarlyCheckout.find({ employeeId: { $in: empIds } })
          .sort({ createdAt: -1 })
          .populate('employeeId', 'name eid')
          .populate('attendanceId', 'date checkIn checkOut status')
          .populate('approvedBy', 'name');
        return res.json(format(items));
      }
    }

    const items = await EarlyCheckout.find({ employeeId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('attendanceId', 'date checkIn checkOut status');
    res.json(format(items));
  } catch (err) {
    console.error('Early checkout GET error:', err);
    res.status(500).json({ msg: err.message });
  }
});

router.put('/early/:id/approve', auth.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ msg: 'Status must be approved or declined' });
    }

    const ec = await EarlyCheckout.findById(req.params.id);
    if (!ec) return res.status(404).json({ msg: 'Early checkout not found' });
    if (ec.status !== 'pending') return res.status(400).json({ msg: 'Already processed' });

    ec.status = status;
    ec.approvedBy = req.user.id;
    ec.approvedAt = new Date();
    await ec.save();

    const att = await Record.findById(ec.attendanceId).select('date').lean();
    const dateLabel = att && att.date ? att.date : 'today';
    const isApproved = status === 'approved';

    await AdminNotification.create({
      type: isApproved ? 'early_checkout_approved' : 'early_checkout_declined',
      title: isApproved ? 'Early leave approved' : 'Early leave declined',
      titleAr: isApproved ? 'تمت الموافقة على الاستئذان المبكر' : 'تم رفض الاستئذان المبكر',
      body: isApproved
        ? `Your early leave request for ${dateLabel} has been approved.`
        : `Your early leave request for ${dateLabel} has been declined.`,
      bodyAr: isApproved
        ? `تمت الموافقة على طلب الاستئذان المبكر لتاريخ ${dateLabel}.`
        : `تم رفض طلب الاستئذان المبكر لتاريخ ${dateLabel}.`,
      ref: { kind: 'early_checkout', id: ec._id.toString() },
      recipientId: String(ec.employeeId),
    });

    res.json({ msg: 'Success', earlyCheckout: ec });
  } catch (err) {
    console.error('Early checkout approve error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
