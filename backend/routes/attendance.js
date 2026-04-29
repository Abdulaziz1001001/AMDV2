const express = require('express');
const auth = require('../middleware/authMiddleware');
const Record = require('../models/Record');
const { closeDaySchema, validateBody } = require('../middleware/validation');
const { closeDay } = require('../controllers/attendanceController');
const {
  getAbsenteeTriggerTime,
  updateAbsenteeTriggerTime,
  getSchedulerState,
} = require('../lib/absenteeScheduler');

const router = express.Router();
router.use(auth);

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

router.post('/close-day', auth.requireRole('admin'), validateBody(closeDaySchema), closeDay);

router.get('/absentee-trigger-time', auth.requireRole('admin'), async (req, res) => {
  try {
    const triggerTime = await getAbsenteeTriggerTime();
    const scheduler = getSchedulerState();
    res.json({ triggerTime, scheduler });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put('/absentee-trigger-time', auth.requireRole('admin'), async (req, res) => {
  try {
    const triggerTime = String(req.body.triggerTime || '').trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(triggerTime)) {
      return res.status(400).json({ msg: 'triggerTime must be in HH:mm format' });
    }
    await updateAbsenteeTriggerTime(triggerTime);
    res.json({ msg: 'Absentee trigger time updated', triggerTime });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

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

module.exports = router;
