const express = require('express');
const auth = require('../middleware/authMiddleware');
const Record = require('../models/Record');
const Employee = require('../models/Employee');
const { closeDaySchema, validateBody } = require('../middleware/validation');
const { closeDay } = require('../controllers/attendanceController');

const router = express.Router();
router.use(auth);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.post('/close-day', auth.requireRole('admin'), validateBody(closeDaySchema), closeDay);

router.post('/break-start', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const date = todayStr();
    const record = await Record.findOne({ employeeId: String(req.user.id), date });
    if (!record) return res.status(400).json({ msg: 'No check-in record for today' });
    if (record.checkOut) return res.status(400).json({ msg: 'Already checked out' });

    const openBreak = record.breaks.find((b) => !b.end);
    if (openBreak) return res.status(400).json({ msg: 'Break already in progress' });

    record.breaks.push({ start: new Date().toISOString() });
    await record.save();
    res.json({ msg: 'Break started', record });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/break-end', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const date = todayStr();
    const record = await Record.findOne({ employeeId: String(req.user.id), date });
    if (!record) return res.status(400).json({ msg: 'No record for today' });

    const openBreak = record.breaks.find((b) => !b.end);
    if (!openBreak) return res.status(400).json({ msg: 'No active break to end' });

    openBreak.end = new Date().toISOString();
    await record.save();
    res.json({ msg: 'Break ended', record });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/report', auth.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId, from, to } = req.query;
    const month = req.query.month;
    const year = req.query.year;

    let startDate, endDate;
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
    } else {
      startDate = from;
      endDate = to;
    }

    const q = {};
    if (employeeId) q.employeeId = employeeId;
    if (startDate || endDate) { q.date = {}; if (startDate) q.date.$gte = startDate; if (endDate) q.date.$lte = endDate; }

    const records = await Record.find(q).sort({ date: 1 });

    const empIds = employeeId ? [employeeId] : [...new Set(records.map((r) => r.employeeId))];
    const employees = await Employee.find({ _id: { $in: empIds } });
    const empMap = {};
    employees.forEach((e) => { empMap[String(e._id)] = e; });

    const Department = require('../models/Department');
    const depts = await Department.find();
    const deptMap = {};
    depts.forEach((d) => { deptMap[String(d._id)] = d.name; });

    const summary = empIds.map((eid) => {
      const emp = empMap[eid] || {};
      const empRecs = records.filter((r) => r.employeeId === eid);
      const present = empRecs.filter((r) => ['present', 'late', 'early_leave'].includes(r.status)).length;
      const late = empRecs.filter((r) => r.status === 'late').length;
      const absent = empRecs.filter((r) => r.status === 'absent').length;
      const onLeave = empRecs.filter((r) => r.status === 'unpaid_leave').length;
      const overtimeMin = empRecs.reduce((a, r) => a + (r.overtimeMinutes || 0), 0);
      const totalBreakMin = empRecs.reduce((a, r) => {
        return a + (r.breaks || []).reduce((b, br) => {
          if (!br.start || !br.end) return b;
          return b + (new Date(br.end) - new Date(br.start)) / 60000;
        }, 0);
      }, 0);

      return {
        employeeId: eid,
        name: emp.name || 'Unknown',
        eid: emp.eid || '',
        department: emp.departmentId ? (deptMap[String(emp.departmentId)] || '') : '',
        totalDays: empRecs.length,
        present, late, absent, onLeave,
        overtimeHours: Math.round(overtimeMin / 60 * 10) / 10,
        totalBreakHours: Math.round(totalBreakMin / 60 * 10) / 10,
      };
    });

    // Department-level roll-ups
    const deptRollup = {};
    summary.forEach((s) => {
      const d = s.department || 'Unassigned';
      if (!deptRollup[d]) deptRollup[d] = { department: d, employees: 0, present: 0, late: 0, absent: 0, onLeave: 0, overtimeHours: 0, totalBreakHours: 0 };
      deptRollup[d].employees++;
      deptRollup[d].present += s.present;
      deptRollup[d].late += s.late;
      deptRollup[d].absent += s.absent;
      deptRollup[d].onLeave += s.onLeave;
      deptRollup[d].overtimeHours += s.overtimeHours;
      deptRollup[d].totalBreakHours += s.totalBreakHours;
    });

    res.json({ employees: summary, departments: Object.values(deptRollup) });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
