const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const LeaveRequest = require('../models/LeaveRequest');
const WorkPolicy = require('../models/WorkPolicy');
const Record = require('../models/Record');
const AdminNotification = require('../models/AdminNotification');

const router = express.Router();

router.use(auth);
const allowedLeaveTypes = LeaveRequest.LEAVE_TYPES || [];
const uploadsRoot = path.join(__dirname, '..', '..', '..', 'private_uploads', 'leave-attachments');
fs.mkdirSync(uploadsRoot, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadsRoot),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safe = `${String(req.user.id)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || (file.mimetype && file.mimetype.startsWith('image/'));
    if (!ok) return cb(new Error('Only PDF and image files are allowed'));
    cb(null, true);
  },
});

// Helper function: send mock email
async function sendEmailNotification(to, subject, body) {
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  console.log(`[EMAIL BODY]\n${body}\n`);
}

// -----------------------------------------------------
// 1. Employee Endpoints
// -----------------------------------------------------

// Get profile and leave balance
router.get('/me/profile', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const emp = await Employee.findById(req.user.id).populate('departmentId');
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    const policy = await WorkPolicy.findOne({ key: 'company' });
    const annualAllowed = policy && policy.annualLeaveDays ? policy.annualLeaveDays : 30;

    const approvedLeaves = await LeaveRequest.find({
      employeeId: req.user.id,
      status: 'approved',
      type: { $in: ['Annual Leave', 'annual'] }
    });

    const usedAnnualDays = approvedLeaves.reduce((acc, l) => acc + l.requestedDays, 0);
    const balance = annualAllowed - usedAnnualDays;

    res.json({
      profile: emp,
      leaveBalance: {
        allowed: annualAllowed,
        used: usedAnnualDays,
        balance
      }
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/me/leave-requests', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
    const format = (arr) => arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));
    res.json(format(leaves));
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Submit a leave request
router.post('/me/leave-request', auth.requireRole(['employee', 'manager']), upload.single('attachment'), async (req, res) => {
  try {
    const { startDate, endDate, type, reason } = req.body;
    
    if (!startDate || !endDate || !type) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const requestedDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    if (!allowedLeaveTypes.includes(type)) {
      return res.status(400).json({ msg: 'Invalid leave type' });
    }
    if (requestedDays > 3 && !req.file) {
      return res.status(400).json({ msg: 'Attachment is required for leave requests longer than 3 days' });
    }

    // Check for overlapping leave requests (pending or approved)
    const overlapping = await LeaveRequest.findOne({
      employeeId: req.user.id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });
    if (overlapping) {
      return res.status(400).json({ msg: 'You already have a leave request overlapping these dates' });
    }

    if (type === 'Annual Leave') {
      const policy = await WorkPolicy.findOne({ key: 'company' });
      const annualAllowed = policy && policy.annualLeaveDays ? policy.annualLeaveDays : 30;

      const approvedLeaves = await LeaveRequest.find({
        employeeId: req.user.id,
        status: 'approved',
        type: { $in: ['Annual Leave', 'annual'] }
      });
      const usedAnnualDays = approvedLeaves.reduce((acc, l) => acc + l.requestedDays, 0);
      
      if (usedAnnualDays + requestedDays > annualAllowed) {
        return res.status(400).json({ msg: 'Leave balance exceeded' });
      }
    }

    const leave = new LeaveRequest({
      employeeId: req.user.id,
      startDate: start,
      endDate: end,
      type,
      reason,
      requestedDays,
      status: 'pending',
      attachmentUrl: req.file ? req.file.filename : undefined,
    });
    await leave.save();

    const emp = await Employee.findById(req.user.id);
    let managerEmail = 'admin@amd-contracting.com'; // fallback
    if (emp.departmentId) {
      const dept = await Department.findById(emp.departmentId).populate('managerId');
      if (dept && dept.managerId && dept.managerId.email) {
        managerEmail = dept.managerId.email;
      }
    }

    // In-app Notification for Admin/Manager
    await AdminNotification.create({
      type: 'leave_request',
      title: 'New Leave Request',
      titleAr: 'طلب إجازة جديد',
      body: `${emp.name} requested ${requestedDays} day(s) of ${type} leave${leave.attachmentUrl ? ' with attachment' : ''}.`,
      bodyAr: `${emp.name} طلب ${requestedDays} يوم/أيام من إجازة ${type}${leave.attachmentUrl ? ' مع مرفق' : ''}.`,
      ref: { kind: 'leave', id: leave._id.toString() }
    });

    // Email Notification
    sendEmailNotification(
      managerEmail,
      'New Leave Request Submitted',
      `Employee ${emp.name} has submitted a new leave request for ${requestedDays} day(s).\nReason: ${reason || 'N/A'}`
    );

    res.json({ msg: 'Leave request submitted successfully', leave });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Calculate Monthly Payroll
router.get('/me/payroll', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const { month, year } = req.query; // e.g., month=4, year=2026
    if (!month || !year) return res.status(400).json({ msg: 'month and year are required' });

    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    // Get all records for this month
    // Find unpaid absences
    const startDateStr = `${y}-${m.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDateStr = `${y}-${m.toString().padStart(2, '0')}-${lastDay}`;

    const records = await Record.find({
      employeeId: String(req.user.id),
      date: { $gte: startDateStr, $lte: endDateStr }
    });

    const unpaidAbsences = records.filter(r => r.status === 'absent' || r.status === 'unpaid_leave').length;
    
    const baseSalary = emp.salary || 0;
    const dailyRate = baseSalary / 30; // standard 30 days calculation
    const deduction = unpaidAbsences * dailyRate;
    const netSalary = baseSalary - deduction;

    res.json({
      month: m,
      year: y,
      baseSalary,
      unpaidAbsences,
      deduction,
      netSalary
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});
router.get('/department/leaves', auth.requireRole('manager'), async (req, res) => {
  try {
    const dept = await Department.findOne({ managerId: req.user.id });
    if (!dept) return res.status(404).json({ msg: 'No department managed by this user' });

    const emps = await Employee.find({ departmentId: dept._id });
    const empIds = emps.map(e => e._id);

    const leaves = await LeaveRequest.find({ employeeId: { $in: empIds } }).populate('employeeId', 'name eid');
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.patch('/department/leaves/:id', auth.requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('employeeId');
    if (!leave) return res.status(404).json({ msg: 'Leave request not found' });

    if (req.user.role !== 'admin') {
      const dept = await Department.findOne({ managerId: req.user.id });
      if (!dept || String(leave.employeeId.departmentId) !== String(dept._id)) {
        return res.status(403).json({ msg: 'Not authorized to approve for this department' });
      }
    }

    const policy = await WorkPolicy.findOne({ key: 'company' });
    const chain = policy && policy.approvalChains ? policy.approvalChains.find(c => c.type === 'leave') : null;
    const steps = chain ? chain.steps : [];
    const manager = await Employee.findById(req.user.id);

    leave.approvalHistory = leave.approvalHistory || [];
    leave.approvalHistory.push({
      role: req.user.role,
      label: req.user.role === 'admin' ? 'Admin' : 'Manager',
      actorId: req.user.id,
      actorName: manager ? manager.name : req.user.role,
      action: status,
      actionAt: new Date(),
    });

    if (status === 'rejected') {
      leave.status = 'rejected';
    } else if (steps.length > 0 && (leave.approvalLevel || 0) < steps.length - 1) {
      leave.approvalLevel = (leave.approvalLevel || 0) + 1;
      const nextStep = steps[leave.approvalLevel];
      leave.status = nextStep ? `${nextStep.role}_approved` : 'approved';
      if (leave.approvalLevel >= steps.length) leave.status = 'approved';
    } else {
      leave.status = 'approved';
    }

    leave.approvedAt = new Date();
    leave.approvedByRole = req.user.role === 'admin' ? 'admin' : 'manager';
    leave.approvedBy = req.user.id;
    await leave.save();

    const finalStatus = leave.status;
    await AdminNotification.create({
      type: 'leave_' + finalStatus,
      title: `Leave ${finalStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} by ${manager ? manager.name : 'Manager'}`,
      titleAr: finalStatus.includes('approved') ? 'تمت الموافقة على الإجازة من المدير' : 'تم رفض الإجازة من المدير',
      body: `${manager ? manager.name : 'Manager'}: ${leave.employeeId.name}'s ${leave.requestedDays}-day ${leave.type} leave → ${finalStatus}.`,
      bodyAr: `${manager ? manager.name : 'المدير'}: إجازة ${leave.employeeId.name} (${leave.requestedDays} يوم) → ${finalStatus}.`,
      ref: { kind: 'leave', id: leave._id.toString() },
    });

    sendEmailNotification(
      leave.employeeId.email || 'employee@amd.com',
      `Leave Request ${status.toUpperCase()}`,
      `Your leave request for ${leave.requestedDays} day(s) has been ${status}.`
    );

    res.json({ msg: 'Success', leave });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/leave-request/:id/attachment', auth.requireRole(['employee', 'manager', 'admin']), async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id).populate('employeeId');
    if (!leave || !leave.attachmentUrl) return res.status(404).json({ msg: 'Attachment not found' });

    const userId = String(req.user.id);
    const ownerId = String(leave.employeeId._id);
    let allowed = req.user.role === 'admin' || userId === ownerId;

    if (!allowed && req.user.role === 'manager') {
      const dept = await Department.findOne({ managerId: req.user.id });
      if (dept && String(leave.employeeId.departmentId) === String(dept._id)) allowed = true;
    }
    if (!allowed) return res.status(403).json({ msg: 'Forbidden' });

    const filePath = path.join(uploadsRoot, leave.attachmentUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    return res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});
router.get('/me/notifications', async (req, res) => {
  try {
    const items = await AdminNotification.find({ recipientId: String(req.user.id) })
      .sort({ createdAt: -1 }).limit(30).lean();
    const unreadCount = await AdminNotification.countDocuments({ recipientId: String(req.user.id), readAt: null });
    const safe = items.map(n => ({
      id: n._id.toString(),
      type: n.type || '',
      title: n.title || '',
      body: n.body || '',
      titleAr: n.titleAr || '',
      bodyAr: n.bodyAr || '',
      ref: n.ref || {},
      readAt: n.readAt || null,
      createdAt: n.createdAt,
    }));
    res.json({ items: safe, unreadCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.patch('/me/notifications/:id/read', async (req, res) => {
  try {
    const notif = await AdminNotification.findById(req.params.id);
    if (!notif || String(notif.recipientId) !== String(req.user.id)) {
      return res.status(404).json({ msg: 'Not found' });
    }
    notif.readAt = new Date();
    await notif.save();
    const unreadCount = await AdminNotification.countDocuments({ recipientId: String(req.user.id), readAt: null });
    res.json({ msg: 'Success', unreadCount });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ msg: 'Attachment must be 5MB or less' });
  }
  return res.status(400).json({ msg: err.message || 'Upload error' });
});
module.exports = router;
