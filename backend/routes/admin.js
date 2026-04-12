const express = require('express');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Group = require('../models/Group');
const Location = require('../models/Location');
const Record = require('../models/Record');
const AdminUser = require('../models/Admin');
const AdminNotification = require('../models/AdminNotification');
const WorkPolicy = require('../models/WorkPolicy');
const auth = require('../middleware/authMiddleware');
const { employeeWriteSchema, validateBody } = require('../middleware/validation');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole('admin'));

router.get('/all-data', async (req, res) => {
  try {
    const employees = await Employee.find();
    const groups = await Group.find();
    const locations = await Location.find();
    const records = await Record.find();
    const workPolicy = await WorkPolicy.findOne({ key: 'company' });
    const notificationUnreadCount = await AdminNotification.countDocuments({ readAt: null });

    const format = (arr) => arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));

    res.json({
      employees: format(employees),
      groups: format(groups),
      locations: format(locations),
      records: format(records),
      workPolicy: workPolicy ? { ...workPolicy._doc, id: workPolicy._id.toString() } : null,
      notificationUnreadCount,
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

router.put('/work-policy', async (req, res) => {
  try {
    let policy = await WorkPolicy.findOne({ key: 'company' });
    if (!policy) {
      policy = new WorkPolicy({ key: 'company', ...req.body });
    } else {
      Object.assign(policy, req.body);
    }
    await policy.save();
    res.json({ ...policy._doc, id: policy._id.toString() });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const items = await AdminNotification.find().sort({ createdAt: -1 }).limit(50);
    const unreadCount = await AdminNotification.countDocuments({ readAt: null });
    res.json({ items: items.map(n => ({ ...n._doc, id: n._id.toString() })), unreadCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await AdminNotification.findByIdAndUpdate(req.params.id, { readAt: new Date() });
    const unreadCount = await AdminNotification.countDocuments({ readAt: null });
    res.json({ msg: 'Success', unreadCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    await AdminNotification.updateMany({ readAt: null }, { readAt: new Date() });
    res.json({ msg: 'Success' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
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
    const { id, name, desc, color } = req.body;
    if (id) {
      await Group.findByIdAndUpdate(id, { name, desc, color });
    } else {
      const group = new Group({ name, desc, color });
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
    res.json({ msg: 'Success' });
  } catch (err) {
    console.error('Approval Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
