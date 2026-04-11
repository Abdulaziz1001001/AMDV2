const express = require('express');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Group = require('../models/Group');
const Location = require('../models/Location');
const Record = require('../models/Record');
const AdminUser = require('../models/Admin');
const AdminNotification = require('../models/AdminNotification');
const auth = require('../middleware/authMiddleware');
const { employeeWriteSchema, validateBody } = require('../middleware/validation');
const { ensureWorkPolicy } = require('../lib/ensureWorkPolicy');
const { formatPolicyForClient } = require('../lib/workCalendar');
const { markNotificationsReadForRecord } = require('../lib/recordNotifications');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole('admin'));

router.get('/all-data', async (req, res) => {
  try {
    const policyDoc = await ensureWorkPolicy();
    const employees = await Employee.find();
    const groups = await Group.find();
    const locations = await Location.find();
    const records = await Record.find();

    const format = (arr) => arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));

    const notificationUnreadCount = await AdminNotification.countDocuments({ readAt: null });

    res.json({
      employees: format(employees),
      groups: format(groups),
      locations: format(locations),
      records: format(records),
      workPolicy: formatPolicyForClient(policyDoc),
      notificationUnreadCount,
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/employee', validateBody(employeeWriteSchema), async (req, res) => {
  try {
    const {
      id,
      eid,
      name,
      username,
      password,
      email,
      phone,
      groupId,
      workStart,
      workEnd,
      salary,
      active,
    } = req.body;

    if (id) {
      const update = {
        eid,
        name,
        username,
        email,
        phone,
        groupId,
        workStart,
        workEnd,
        salary,
      };
      if (active !== undefined) update.active = active;
      if (password && String(password).trim().length > 0) {
        const salt = await bcrypt.genSalt(10);
        update.password = await bcrypt.hash(password, salt);
      }
      await Employee.findByIdAndUpdate(id, update);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const emp = new Employee({
        eid,
        name,
        username,
        password: hashedPassword,
        email,
        phone,
        groupId,
        workStart,
        workEnd,
        salary,
        active: active !== false,
      });
      await emp.save();
    }
    res.json({ msg: 'Success' });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) return res.status(400).json({ msg: 'اسم المستخدم موجود مسبقاً' });
    res.status(500).json({ msg: err.message });
  }
});

router.delete('/employee/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});

router.post('/group', async (req, res) => {
  try {
    const { id, name, desc, color, weekendDays, ignoreCompanyHolidays, extraNonWorkDates } = req.body;
    const update = { name, desc, color };
    if (ignoreCompanyHolidays !== undefined) {
      update.ignoreCompanyHolidays = ignoreCompanyHolidays === true;
    }
    if (extraNonWorkDates !== undefined) {
      update.extraNonWorkDates = Array.isArray(extraNonWorkDates)
        ? extraNonWorkDates.map(String).filter(Boolean)
        : [];
    }
    if (Array.isArray(weekendDays) && weekendDays.length > 0) {
      const ok = weekendDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      if (!ok) return res.status(400).json({ msg: 'weekendDays must be integers 0–6' });
      update.weekendDays = weekendDays;
    } else if (weekendDays !== undefined) {
      update.weekendDays = [];
    }
    if (id) {
      await Group.findByIdAndUpdate(id, update);
    } else {
      const group = new Group({
        name,
        desc,
        color,
        ignoreCompanyHolidays: ignoreCompanyHolidays === true,
        extraNonWorkDates: Array.isArray(extraNonWorkDates)
          ? extraNonWorkDates.map(String).filter(Boolean)
          : [],
        ...(Array.isArray(weekendDays) && weekendDays.length > 0
          ? { weekendDays }
          : weekendDays !== undefined
            ? { weekendDays: [] }
            : {}),
      });
      await group.save();
    }
    res.json({ msg: 'Success' });
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});

router.delete('/group/:id', async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});

router.post('/location', async (req, res) => {
  try {
    const { name, groupId, lat, lng, radius } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ msg: 'name, lat, and lng are required' });
    }
    const loc = new Location({ name, groupId, lat, lng, radius });
    await loc.save();
    res.json({ msg: 'Success' });
  } catch (err) {
    console.error('Location Save Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

router.delete('/location/:id', async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});

router.post('/profile', async (req, res) => {
  try {
    const { adminId, username, email, password } = req.body;
    if (!adminId) return res.status(400).json({ msg: 'adminId is required' });
    let admin = await AdminUser.findById(adminId);

    if (!admin) return res.status(404).json({ msg: 'Admin not found' });

    admin.username = username || admin.username;
    admin.email = email || admin.email;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();

    res.json({
      msg: 'Profile updated successfully',
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error while updating profile' });
  }
});

router.put('/approve-record/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'status must be approved or rejected' });
    }
    const mongoose = require('mongoose');
    const record = await mongoose.models.Record.findByIdAndUpdate(req.params.id, { approvalStatus: status });
    if (!record) return res.status(404).json({ msg: 'Record not found' });
    await markNotificationsReadForRecord(req.params.id);
    res.json({ msg: 'Success' });
  } catch (err) {
    console.error('Approval Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

function validateWorkPolicyBody(body) {
  const out = {};
  if (body.timeZone != null) {
    out.timeZone = String(body.timeZone).trim() || 'Asia/Riyadh';
  }
  if (body.defaultWeekendDays != null) {
    if (!Array.isArray(body.defaultWeekendDays)) return { error: 'defaultWeekendDays must be an array' };
    if (!body.defaultWeekendDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
      return { error: 'defaultWeekendDays must be integers 0–6' };
    }
    out.defaultWeekendDays = body.defaultWeekendDays;
  }
  if (body.companyHolidays != null) {
    if (!Array.isArray(body.companyHolidays)) return { error: 'companyHolidays must be an array' };
    const re = /^\d{4}-\d{2}-\d{2}$/;
    for (const h of body.companyHolidays) {
      if (!h || !re.test(h.date)) return { error: 'Each holiday needs date YYYY-MM-DD' };
    }
    out.companyHolidays = body.companyHolidays.map((h) => ({
      date: h.date,
      nameEn: h.nameEn != null ? String(h.nameEn) : '',
      nameAr: h.nameAr != null ? String(h.nameAr) : '',
    }));
  }
  if (body.lateGraceMinutes != null) {
    const n = Number(body.lateGraceMinutes);
    if (!Number.isFinite(n) || n < 0 || n > 240) return { error: 'lateGraceMinutes must be 0–240' };
    out.lateGraceMinutes = n;
  }
  if (body.excuseReasons != null) {
    if (!Array.isArray(body.excuseReasons)) return { error: 'excuseReasons must be an array' };
    for (const r of body.excuseReasons) {
      if (!r || !String(r.code || '').trim()) return { error: 'Each excuse needs a code' };
    }
    out.excuseReasons = body.excuseReasons.map((r) => ({
      code: String(r.code).trim(),
      labelEn: r.labelEn != null ? String(r.labelEn) : '',
      labelAr: r.labelAr != null ? String(r.labelAr) : '',
    }));
  }
  return { value: out };
}

router.get('/work-policy', async (req, res) => {
  try {
    const doc = await ensureWorkPolicy();
    res.json(formatPolicyForClient(doc));
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.put('/work-policy', async (req, res) => {
  try {
    const parsed = validateWorkPolicyBody(req.body);
    if (parsed.error) return res.status(400).json({ msg: parsed.error });
    const doc = await ensureWorkPolicy();
    Object.assign(doc, parsed.value);
    await doc.save();
    res.json(formatPolicyForClient(doc));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const items = await AdminNotification.find().sort({ createdAt: -1 }).limit(limit).lean();
    const unreadCount = await AdminNotification.countDocuments({ readAt: null });
    const list = items.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      titleAr: n.titleAr,
      bodyAr: n.bodyAr,
      ref: n.ref,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));
    res.json({ items: list, unreadCount });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const n = await AdminNotification.findByIdAndUpdate(req.params.id, { readAt: new Date() }, { new: true });
    if (!n) return res.status(404).json({ msg: 'Not found' });
    const unreadCount = await AdminNotification.countDocuments({ readAt: null });
    res.json({ msg: 'OK', unreadCount });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    await AdminNotification.updateMany({ readAt: null }, { $set: { readAt: new Date() } });
    res.json({ msg: 'OK', unreadCount: 0 });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
