const express = require('express');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const LeaveRequest = require('../models/LeaveRequest');
const WorkPolicy = require('../models/WorkPolicy');
const Record = require('../models/Record');
const AdminNotification = require('../models/AdminNotification');

const router = express.Router();

router.use(auth);

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
      type: 'annual'
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

// Submit a leave request
router.post('/me/leave-request', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, type, reason } = req.body;
    
    if (!startDate || !endDate || !type) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const requestedDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    if (type === 'annual') {
      const policy = await WorkPolicy.findOne({ key: 'company' });
      const annualAllowed = policy && policy.annualLeaveDays ? policy.annualLeaveDays : 30;

      const approvedLeaves = await LeaveRequest.find({
        employeeId: req.user.id,
        status: 'approved',
        type: 'annual'
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
      status: 'pending'
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
      body: `${emp.name} requested ${requestedDays} day(s) of ${type} leave.`,
      bodyAr: `${emp.name} طلب ${requestedDays} يوم/أيام من إجازة ${type}.`,
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
      employeeId: req.user.id,
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

// -----------------------------------------------------
// 2. Manager Endpoints
// -----------------------------------------------------

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

router.patch('/department/leaves/:id', auth.requireRole('manager'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('employeeId');
    if (!leave) return res.status(404).json({ msg: 'Leave request not found' });

    const dept = await Department.findOne({ managerId: req.user.id });
    if (!dept || String(leave.employeeId.departmentId) !== String(dept._id)) {
      return res.status(403).json({ msg: 'Not authorized to approve for this department' });
    }

    leave.status = status;
    await leave.save();

    // Notify employee (email mock)
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

module.exports = router;
