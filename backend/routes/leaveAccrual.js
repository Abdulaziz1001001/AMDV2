const express = require('express');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const WorkPolicy = require('../models/WorkPolicy');
const LeaveRequest = require('../models/LeaveRequest');
const { logAudit } = require('../lib/auditHelper');

const router = express.Router();
router.use(auth);

router.get('/balances', auth.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const employees = await Employee.find({ active: true }).populate('departmentId', 'name');
    const policy = await WorkPolicy.findOne({ key: 'company' });
    const annualAllowed = policy ? policy.annualLeaveDays || 30 : 30;

    const approvedLeaves = await LeaveRequest.find({
      status: 'approved',
      type: { $in: ['Annual Leave', 'annual'] },
    });

    const usedMap = {};
    approvedLeaves.forEach((l) => {
      const eid = String(l.employeeId);
      usedMap[eid] = (usedMap[eid] || 0) + l.requestedDays;
    });

    const balances = employees.map((emp) => {
      const eid = String(emp._id);
      const used = usedMap[eid] || 0;
      const accrued = emp.leaveBalance || 0;
      const effectiveAllowed = policy && policy.leaveAccrual && policy.leaveAccrual.enabled ? accrued : annualAllowed;
      return {
        employeeId: eid,
        name: emp.name,
        eid: emp.eid,
        department: emp.departmentId ? emp.departmentId.name : '',
        hireDate: emp.hireDate,
        allowed: effectiveAllowed,
        used,
        balance: effectiveAllowed - used,
        accrued,
        lastAccrualDate: emp.lastAccrualDate,
      };
    });

    res.json(balances);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/run-accrual', auth.requireRole('admin'), async (req, res) => {
  try {
    const policy = await WorkPolicy.findOne({ key: 'company' });
    if (!policy || !policy.leaveAccrual || !policy.leaveAccrual.enabled) {
      return res.status(400).json({ msg: 'Leave accrual is not enabled in work policy' });
    }

    const { monthlyRate, probationMonths, maxCarryForward } = policy.leaveAccrual;
    const rate = monthlyRate || 2.5;
    const probation = probationMonths || 3;
    const maxCF = maxCarryForward || 15;
    const annualMax = policy.annualLeaveDays || 30;

    const employees = await Employee.find({ active: true });
    const now = new Date();
    let updated = 0;

    for (const emp of employees) {
      if (emp.hireDate) {
        const monthsSinceHire = (now.getFullYear() - emp.hireDate.getFullYear()) * 12 + (now.getMonth() - emp.hireDate.getMonth());
        if (monthsSinceHire < probation) continue;
      }

      const lastAccrual = emp.lastAccrualDate ? new Date(emp.lastAccrualDate) : null;
      if (lastAccrual && lastAccrual.getMonth() === now.getMonth() && lastAccrual.getFullYear() === now.getFullYear()) {
        continue;
      }

      const newBalance = Math.min((emp.leaveBalance || 0) + rate, annualMax + maxCF);
      await Employee.findByIdAndUpdate(emp._id, {
        $set: { leaveBalance: newBalance, lastAccrualDate: now },
      });
      updated++;
    }

    logAudit(req, 'leave_accrual_run', 'WorkPolicy', 'company', null, { updated, rate });
    res.json({ msg: `Accrual completed for ${updated} employee(s)`, updated });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/carry-forward-report', auth.requireRole('admin'), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const policy = await WorkPolicy.findOne({ key: 'company' });
    const annualAllowed = policy ? policy.annualLeaveDays || 30 : 30;
    const maxCF = policy && policy.leaveAccrual ? policy.leaveAccrual.maxCarryForward || 15 : 15;

    const employees = await Employee.find({ active: true });
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const approvedLeaves = await LeaveRequest.find({
      status: 'approved',
      type: { $in: ['Annual Leave', 'annual'] },
      startDate: { $gte: new Date(yearStart), $lte: new Date(yearEnd) },
    });

    const usedMap = {};
    approvedLeaves.forEach((l) => {
      const eid = String(l.employeeId);
      usedMap[eid] = (usedMap[eid] || 0) + l.requestedDays;
    });

    const report = employees.map((emp) => {
      const eid = String(emp._id);
      const used = usedMap[eid] || 0;
      const remaining = annualAllowed - used;
      const carryForward = Math.min(Math.max(remaining, 0), maxCF);
      const forfeited = Math.max(remaining - maxCF, 0);
      return {
        employeeId: eid,
        name: emp.name,
        eid: emp.eid,
        allowed: annualAllowed,
        used,
        remaining,
        carryForward,
        forfeited,
      };
    });

    res.json({ year, maxCarryForward: maxCF, report });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/encash', auth.requireRole('admin'), async (req, res) => {
  try {
    const { employeeId, days } = req.body;
    if (!employeeId || !days || days <= 0) return res.status(400).json({ msg: 'employeeId and positive days required' });

    const policy = await WorkPolicy.findOne({ key: 'company' });
    if (!policy || !policy.leaveAccrual || !policy.leaveAccrual.encashmentAllowed) {
      return res.status(400).json({ msg: 'Leave encashment is not enabled' });
    }

    const maxDays = policy.leaveAccrual.encashmentMaxDays || 10;
    if (days > maxDays) return res.status(400).json({ msg: `Max encashment is ${maxDays} days` });

    const emp = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });
    if ((emp.leaveBalance || 0) < days) return res.status(400).json({ msg: 'Insufficient leave balance' });

    await Employee.findByIdAndUpdate(employeeId, { $inc: { leaveBalance: -days } });
    logAudit(req, 'leave_encashment', 'Employee', employeeId, { leaveBalance: emp.leaveBalance }, { days, newBalance: emp.leaveBalance - days });

    const dailyRate = (emp.salary || 0) / 30;
    const amount = Math.round(days * dailyRate * 100) / 100;

    res.json({ msg: `${days} day(s) encashed for ${emp.name}`, amount, days });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
