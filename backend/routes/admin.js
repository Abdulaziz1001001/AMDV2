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
const { logAudit } = require('../lib/auditHelper');
const { formatAttendanceRecords } = require('../lib/formatAttendanceRecord');

/** Admin dashboard inbox only (not employee-targeted notifications). */
const ADMIN_NOTIFICATION_INBOX = {
  $or: [{ recipientId: null }, { recipientId: { $exists: false } }],
};

async function countAdminInboxUnread() {
  return AdminNotification.countDocuments({ ...ADMIN_NOTIFICATION_INBOX, readAt: null });
}

const router = express.Router();

router.use(auth);
router.use(auth.requireRole('admin'));

router.get('/all-data', async (req, res) => {
  try {
    const Project = require('../models/Project');
    const { Shift } = require('../models/Shift');
    const Announcement = require('../models/Announcement');

    const [employees, groups, locations, records, departments, leaveRequests, workPolicy, notificationUnreadCount, projects, shifts, announcements] = await Promise.all([
      Employee.find(),
      Group.find(),
      Location.find(),
      Record.find().populate('employeeId', 'name eid departmentId'),
      Department.find().populate('managerId', 'name eid'),
      LeaveRequest.find().populate('employeeId', 'name eid'),
      WorkPolicy.findOne({ key: 'company' }),
      countAdminInboxUnread(),
      Project.find().sort({ name: 1 }).populate('managerId', 'name eid'),
      Shift.find().sort({ name: 1 }),
      Announcement.find({ $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: new Date() } }] }).sort({ pinned: -1, createdAt: -1 }).limit(20),
    ]);

    const format = (arr) => arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));

    res.json({
      employees: format(employees),
      groups: format(groups),
      locations: format(locations),
      records: formatAttendanceRecords(records),
      departments: format(departments),
      leaveRequests: format(leaveRequests),
      workPolicy: workPolicy ? { ...workPolicy._doc, id: workPolicy._id.toString() } : null,
      notificationUnreadCount,
      projects: format(projects),
      shifts: format(shifts),
      announcements: format(announcements),
    });
  } catch (err) {
    res.status(500).json({ msg: err.message, stack: err.stack });
  }
});

router.put('/work-policy', async (req, res) => {
  try {
    let policy = await WorkPolicy.findOne({ key: 'company' });
    const prev = policy ? JSON.parse(JSON.stringify(policy._doc)) : null;
    if (!policy) {
      policy = new WorkPolicy({ key: 'company', ...req.body });
    } else {
      Object.assign(policy, req.body);
    }
    await policy.save();
    logAudit(req, 'work_policy_update', 'WorkPolicy', policy._id.toString(), prev, req.body);
    res.json({ ...policy._doc, id: policy._id.toString() });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const filter = ADMIN_NOTIFICATION_INBOX;
    const items = await AdminNotification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    const unreadCount = await countAdminInboxUnread();
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
    const unreadCount = await countAdminInboxUnread();
    res.json({ msg: 'Success', unreadCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

async function adminNotificationsReadAll(req, res) {
  try {
    await AdminNotification.updateMany(
      { readAt: null, ...ADMIN_NOTIFICATION_INBOX },
      { readAt: new Date() },
    );
    const unreadCount = await countAdminInboxUnread();
    res.json({ msg: 'Success', unreadCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}

router.post('/notifications/read-all', adminNotificationsReadAll);
router.put('/notifications/read-all', adminNotificationsReadAll);

router.delete('/notifications/all', async (req, res) => {
  try {
    const r = await AdminNotification.deleteMany(ADMIN_NOTIFICATION_INBOX);
    res.json({ msg: 'Success', deletedCount: r.deletedCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/records/filter', async (req, res) => {
  try {
    const { employeeId, from, to } = req.query;
    const query = {};
    if (employeeId) query.employeeId = String(employeeId);
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = String(from);
      if (to) query.date.$lte = String(to);
    }
    const records = await Record.find(query)
      .populate('employeeId', 'name eid departmentId')
      .sort({ date: -1, createdAt: -1 });
    res.json(formatAttendanceRecords(records));
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
      logAudit(req, 'employee_update', 'Employee', id, null, { name, username });
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
      logAudit(req, 'employee_create', 'Employee', emp._id.toString(), null, { name, username });

      // Auto-generate onboarding checklist
      try {
        const OnboardingChecklist = require('../models/OnboardingChecklist');
        const policy = await WorkPolicy.findOne({ key: 'company' });
        const labels = policy && policy.onboardingItems && policy.onboardingItems.length
          ? policy.onboardingItems
          : ['ID Verification', 'Safety Orientation', 'PPE Issued', 'Contract Signed', 'Bank Details Collected'];
        await OnboardingChecklist.create({
          employeeId: emp._id,
          type: 'onboarding',
          items: labels.map((label) => ({ label, done: false })),
          createdBy: req.user.id,
        });
      } catch (_) { /* best-effort */ }
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
    const emp = await Employee.findById(req.params.id);

    // Auto-generate offboarding checklist
    try {
      const OnboardingChecklist = require('../models/OnboardingChecklist');
      const existing = await OnboardingChecklist.findOne({ employeeId: req.params.id, type: 'offboarding', completedAt: null });
      if (!existing) {
        const policy = await WorkPolicy.findOne({ key: 'company' });
        const labels = policy && policy.offboardingItems && policy.offboardingItems.length
          ? policy.offboardingItems
          : ['Final Settlement', 'Asset Return', 'Access Revocation', 'Exit Interview'];
        await OnboardingChecklist.create({
          employeeId: req.params.id,
          type: 'offboarding',
          items: labels.map((label) => ({ label, done: false })),
          createdBy: req.user.id,
        });
      }
    } catch (_) { /* best-effort */ }

    await Employee.findByIdAndDelete(req.params.id);
    logAudit(req, 'employee_delete', 'Employee', req.params.id, emp ? { name: emp.name } : null, null);
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
    const { name, groupId, lat, lng, radius, allowedGroups } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ msg: 'name, lat, and lng are required' });
    }
    const ag = Array.isArray(allowedGroups) ? allowedGroups.filter((x) => x != null && String(x).trim() !== '') : [];
    const loc = new Location({
      name,
      groupId: groupId != null && groupId !== '' ? groupId : undefined,
      lat,
      lng,
      radius,
      allowedGroups: ag,
    });
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

    const prevStatus = leave.status;
    const policy = await WorkPolicy.findOne({ key: 'company' });
    const chain = policy && policy.approvalChains ? policy.approvalChains.find(c => c.type === 'leave') : null;
    const steps = chain ? chain.steps : [];

    leave.approvalHistory.push({
      role: 'admin',
      label: 'Admin',
      actorId: req.user.id,
      actorName: 'Admin',
      action: status,
      actionAt: new Date(),
    });

    if (status === 'rejected') {
      leave.status = 'rejected';
    } else if (steps.length > 0 && leave.approvalLevel < steps.length - 1) {
      leave.approvalLevel += 1;
      const nextStep = steps[leave.approvalLevel];
      leave.status = nextStep ? `${nextStep.role}_approved` : 'approved';
      if (leave.approvalLevel >= steps.length) leave.status = 'approved';
    } else {
      leave.status = 'approved';
    }

    leave.approvedAt = new Date();
    leave.approvedByRole = 'admin';
    leave.approvedBy = req.user.id;
    await leave.save();
    logAudit(req, 'leave_' + leave.status, 'LeaveRequest', leave._id.toString(), { status: prevStatus }, { status: leave.status });

    const finalStatus = leave.status;
    await AdminNotification.create({
      type: 'leave_' + finalStatus,
      title: `Leave ${finalStatus.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
      titleAr: finalStatus.includes('approved') ? 'تمت الموافقة على الإجازة' : 'تم رفض الإجازة',
      body: `${leave.employeeId.name}'s ${leave.requestedDays}-day ${leave.type} leave: ${finalStatus}.`,
      bodyAr: `إجازة ${leave.employeeId.name} (${leave.requestedDays} يوم): ${finalStatus}.`,
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

    const Overtime = require('../models/Overtime');
    const employees = await Employee.find({ active: true });
    const [records, overtimes] = await Promise.all([
      Record.find({ date: { $gte: startDateStr, $lte: endDateStr } }),
      Overtime.find({ date: { $gte: startDateStr, $lte: endDateStr }, status: 'approved' }),
    ]);

    const result = employees.map(emp => {
      const empRecords = records.filter(r => String(r.employeeId) === String(emp._id));
      const unpaidAbsences = empRecords.filter(r => r.status === 'absent' || r.status === 'unpaid_leave').length;
      const baseSalary = emp.salary || 0;
      const dailyRate = baseSalary / 30;
      const hourlyRate = dailyRate / 8;
      const deduction = unpaidAbsences * dailyRate;
      const empOT = overtimes.filter(o => String(o.employeeId) === String(emp._id));
      const otMinutes = empOT.reduce((a, o) => a + o.extraMinutes, 0);
      const avgMultiplier = empOT.length ? empOT.reduce((a, o) => a + o.rateMultiplier, 0) / empOT.length : 1.5;
      const overtimePay = Math.round((otMinutes / 60) * hourlyRate * avgMultiplier * 100) / 100;
      return {
        employeeId: emp._id,
        name: emp.name,
        eid: emp.eid,
        baseSalary,
        unpaidAbsences,
        deduction,
        overtimeMinutes: otMinutes,
        overtimePay,
        netSalary: baseSalary - deduction + overtimePay,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
