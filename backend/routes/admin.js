const express = require('express');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const Group = require('../models/Group');
const Location = require('../models/Location');
const Record = require('../models/Record');
const AdminUser = require('../models/Admin');
const AdminNotification = require('../models/AdminNotification');
const WorkPolicy = require('../models/WorkPolicy');
const Department = require('../models/Department');
const LeaveRequest = require('../models/LeaveRequest');
const auth = require('../middleware/authMiddleware');
const { employeeWriteSchema, validateBody } = require('../middleware/validation');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole('admin'));

router.get('/all-data', async (req, res) => {
  try {
    const [employees, groups, locations, records, departments, leaveRequests, workPolicy, notificationUnreadCount] = await Promise.all([
      Employee.find(),
      Group.find(),
      Location.find(),
      Record.find(),
      Department.find().populate('managerId', 'name eid'),
      LeaveRequest.find().populate('employeeId', 'name eid'),
      WorkPolicy.findOne({ key: 'company' }),
      AdminNotification.countDocuments({ readAt: null }),
    ]);

    const format = (arr) => arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));

    res.json({
      employees: format(employees),
      groups: format(groups),
      locations: format(locations),
      records: format(records),
      departments: format(departments),
      leaveRequests: format(leaveRequests),
      workPolicy: workPolicy ? { ...workPolicy._doc, id: workPolicy._id.toString() } : null,
      notificationUnreadCount,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message, stack: err.stack });
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
    const items = await AdminNotification.find().sort({ createdAt: -1 }).limit(50).lean();
    const unreadCount = await AdminNotification.countDocuments({ readAt: null });
    const safe = items.map(n => {
      try {
        return {
          id: n._id.toString(),
          type: n.type || '',
          title: n.title || '',
          body: n.body || '',
          titleAr: n.titleAr || '',
          bodyAr: n.bodyAr || '',
          ref: n.ref || { kind: 'unknown', id: '' },
          readAt: n.readAt || null,
          createdAt: n.createdAt,
        };
      } catch (_) {
        return null;
      }
    }).filter(Boolean);
    res.json({ items: safe, unreadCount });
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
      departmentId,
      jobTitle,
      hireDate,
    } = req.body;

    if (id) {
      const setFields = {
        eid,
        name,
        username,
        email,
        phone,
        groupId,
        workStart,
        workEnd,
        salary,
        jobTitle,
      };
      if (active !== undefined) setFields.active = active;
      if (departmentId) setFields.departmentId = departmentId;
      if (hireDate) setFields.hireDate = new Date(hireDate);
      if (password && String(password).trim().length > 0) {
        const salt = await bcrypt.genSalt(10);
        setFields.password = await bcrypt.hash(password, salt);
      }
      const updateOp = { $set: setFields };
      if (!departmentId) updateOp.$unset = { departmentId: 1 };
      await Employee.findByIdAndUpdate(id, updateOp);
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
        departmentId: departmentId || undefined,
        jobTitle,
        hireDate: hireDate ? new Date(hireDate) : undefined,
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
    const data = { name, desc, color, weekendDays, ignoreCompanyHolidays, extraNonWorkDates };
    if (id) {
      await Group.findByIdAndUpdate(id, data);
    } else {
      const group = new Group(data);
      await group.save();
    }
    res.json({ msg: 'Success' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
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

// --- Department CRUD ---

router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find().populate('managerId', 'name eid');
    const format = (arr) => arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));
    res.json(format(departments));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/department', async (req, res) => {
  try {
    const { id, name, managerId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ msg: 'Department name is required' });

    if (id) {
      const updateOp = { $set: { name: name.trim() } };
      if (managerId) updateOp.$set.managerId = managerId;
      else updateOp.$unset = { managerId: 1 };
      await Department.findByIdAndUpdate(id, updateOp);
    } else {
      const dept = new Department({
        name: name.trim(),
        managerId: managerId || undefined,
      });
      await dept.save();
    }
    res.json({ msg: 'Success' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete('/department/:id', async (req, res) => {
  try {
    await Employee.updateMany({ departmentId: req.params.id }, { $unset: { departmentId: 1 } });
    await Department.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// --- Admin leave management ---

router.get('/leave-requests', async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().populate('employeeId', 'name eid').sort({ createdAt: -1 });
    const format = (arr) => arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));
    res.json(format(leaves));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.patch('/leave-requests/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    const leave = await LeaveRequest.findById(req.params.id).populate('employeeId', 'name eid');
    if (!leave) return res.status(404).json({ msg: 'Leave request not found' });

    leave.status = status;
    await leave.save();

    await AdminNotification.create({
      type: 'leave_' + status,
      title: `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      titleAr: status === 'approved' ? 'تمت الموافقة على الإجازة' : 'تم رفض الإجازة',
      body: `${leave.employeeId.name}'s ${leave.requestedDays}-day ${leave.type} leave was ${status}.`,
      bodyAr: `إجازة ${leave.employeeId.name} (${leave.requestedDays} يوم) تم ${status === 'approved' ? 'الموافقة عليها' : 'رفضها'}.`,
      ref: { kind: 'leave', id: leave._id.toString() },
    });

    res.json({ msg: 'Success', leave });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// --- Admin payroll overview ---

router.get('/payroll-overview', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ msg: 'month and year are required' });

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startDateStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDateStr = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;

    const employees = await Employee.find({ active: true });
    const records = await Record.find({ date: { $gte: startDateStr, $lte: endDateStr } });

    const result = employees.map(emp => {
      const empRecords = records.filter(r => String(r.employeeId) === String(emp._id));
      const unpaidAbsences = empRecords.filter(r => r.status === 'absent' || r.status === 'unpaid_leave').length;
      const baseSalary = emp.salary || 0;
      const dailyRate = baseSalary / 30;
      const deduction = unpaidAbsences * dailyRate;
      return {
        employeeId: emp._id,
        name: emp.name,
        eid: emp.eid,
        baseSalary,
        unpaidAbsences,
        deduction,
        netSalary: baseSalary - deduction,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
