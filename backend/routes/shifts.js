const express = require('express');
const auth = require('../middleware/authMiddleware');
const { Shift, ShiftAssignment } = require('../models/Shift');
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
    const shifts = await Shift.find().sort({ name: 1 });
    res.json(fmt(shifts));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/', auth.requireRole('admin'), async (req, res) => {
  try {
    const { id, name, startTime, endTime, color, isDefault } = req.body;
    if (!name || !startTime || !endTime) return res.status(400).json({ msg: 'name, startTime, endTime required' });
    if (id) {
      await Shift.findByIdAndUpdate(id, { name, startTime, endTime, color, isDefault: !!isDefault });
    } else {
      await Shift.create({ name, startTime, endTime, color, isDefault: !!isDefault });
    }
    res.json({ msg: 'Success' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    await ShiftAssignment.deleteMany({ shiftId: req.params.id });
    await Shift.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/assignments', async (req, res) => {
  try {
    const { from, to, employeeId } = req.query;
    const q = {};
    if (employeeId) q.employeeId = employeeId;
    if (from || to) { q.date = {}; if (from) q.date.$gte = from; if (to) q.date.$lte = to; }
    const items = await ShiftAssignment.find(q).populate('shiftId').populate('employeeId', 'name eid');
    res.json(fmt(items));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/assign', auth.requireRole('admin'), async (req, res) => {
  try {
    const { employeeId, shiftId, dates } = req.body;
    if (!employeeId || !shiftId || !dates || !dates.length) {
      return res.status(400).json({ msg: 'employeeId, shiftId, and dates[] required' });
    }
    const ops = dates.map((date) => ({
      updateOne: {
        filter: { employeeId, date },
        update: { $set: { shiftId, employeeId, date } },
        upsert: true,
      },
    }));
    await ShiftAssignment.bulkWrite(ops);
    res.json({ msg: `${dates.length} assignment(s) saved` });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/assign-bulk', auth.requireRole('admin'), async (req, res) => {
  try {
    const { assignments } = req.body;
    if (!Array.isArray(assignments) || !assignments.length) {
      return res.status(400).json({ msg: 'assignments[] required' });
    }
    const ops = assignments.map(({ employeeId, shiftId, date }) => ({
      updateOne: {
        filter: { employeeId, date },
        update: { $set: { shiftId, employeeId, date } },
        upsert: true,
      },
    }));
    await ShiftAssignment.bulkWrite(ops);
    res.json({ msg: `${assignments.length} assignment(s) saved` });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/my-shift', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const date = req.query.date || today;
    const assignment = await ShiftAssignment.findOne({ employeeId: req.user.id, date }).populate('shiftId');
    if (assignment && assignment.shiftId) {
      return res.json({ shift: assignment.shiftId, date });
    }
    const defaultShift = await Shift.findOne({ isDefault: true });
    res.json({ shift: defaultShift || null, date, isDefault: true });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
