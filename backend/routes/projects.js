const express = require('express');
const auth = require('../middleware/authMiddleware');
const Project = require('../models/Project');
const Record = require('../models/Record');
const Employee = require('../models/Employee');

const router = express.Router();
router.use(auth);

function fmt(arr) {
  return arr.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    obj.id = obj._id.toString();
    return obj;
  });
}

router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    const projects = await Project.find(q).sort({ name: 1 }).populate('managerId', 'name eid');
    res.json(fmt(projects));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/', auth.requireRole('admin'), async (req, res) => {
  try {
    const { id, name, code, address, groupId, lat, lng, radius, status, managerId, startDate, expectedEnd } = req.body;
    if (!name) return res.status(400).json({ msg: 'Project name is required' });
    const data = { name, code, address, groupId, lat, lng, radius, status, managerId: managerId || undefined, startDate, expectedEnd };
    if (id) {
      await Project.findByIdAndUpdate(id, data);
    } else {
      await Project.create(data);
    }
    res.json({ msg: 'Success' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/:id/report', auth.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { from, to } = req.query;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    const q = { projectId: req.params.id };
    if (from || to) { q.date = {}; if (from) q.date.$gte = from; if (to) q.date.$lte = to; }

    const records = await Record.find(q).sort({ date: -1 });
    const empIds = [...new Set(records.map((r) => r.employeeId))];
    const employees = await Employee.find({ _id: { $in: empIds } });
    const empMap = {};
    employees.forEach((e) => { empMap[String(e._id)] = e; });

    const summary = empIds.map((eid) => {
      const emp = empMap[eid] || {};
      const empRecs = records.filter((r) => r.employeeId === eid);
      const totalMinutes = empRecs.reduce((acc, r) => {
        if (!r.checkIn || !r.checkOut) return acc;
        return acc + (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
      }, 0);
      return {
        employeeId: eid,
        name: emp.name || 'Unknown',
        eid: emp.eid || '',
        days: empRecs.length,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        salary: emp.salary || 0,
        laborCost: Math.round(((emp.salary || 0) / 30) * empRecs.length * 100) / 100,
      };
    });

    res.json({ project, records: records.length, employees: summary });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
