const express = require('express');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Location = require('../models/Location');
const Record = require('../models/Record');
const { attendanceUpsertSchema, validateBody } = require('../middleware/validation');
const { upsertEmployeeRecord } = require('../controllers/attendanceController');
const { locationVisibleForEmployee } = require('../lib/locationAccess');
const { formatAttendanceRecords } = require('../lib/formatAttendanceRecord');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole(['employee', 'manager']));

function formatDocs(arr) {
  return arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));
}

/** Same shape as /api/admin/all-data, scoped to the logged-in employee (for DB.sync on the portal). */
/** List attendance records for the logged-in employee; optional ?date=YYYY-MM-DD */
router.get('/records', async (req, res) => {
  try {
    const q = { employeeId: String(req.user.id) };
    if (req.query.date) {
      q.date = String(req.query.date);
    }
    const records = await Record.find(q)
      .populate('employeeId', 'name eid departmentId')
      .sort({ date: -1 });
    res.json(formatAttendanceRecords(records));
  } catch (err) {
    console.error('employee /records error:', err);
    res.status(500).json({ msg: err.message });
  }
});

router.get('/me-data', async (req, res) => {
  try {
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    const Announcement = require('../models/Announcement');
    const allLocs = await Location.find();
    const gid = emp.groupId != null ? String(emp.groupId) : '';
    const locations = allLocs.filter((loc) => locationVisibleForEmployee(loc, gid));

    const now = new Date();
    const [records, announcements] = await Promise.all([
      Record.find({ employeeId: String(req.user.id) }).populate('employeeId', 'name eid departmentId'),
      Announcement.find({
        $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }],
        $and: [{ $or: [
          { targetType: 'all' },
          ...(emp.departmentId ? [{ targetType: 'department', targetId: String(emp.departmentId) }] : []),
          ...(emp.groupId ? [{ targetType: 'group', targetId: String(emp.groupId) }] : []),
        ]}],
      }).sort({ pinned: -1, createdAt: -1 }).limit(10),
    ]);

    res.json({
      employees: [],
      groups: [],
      locations: formatDocs(locations),
      records: formatAttendanceRecords(records),
      announcements: formatDocs(announcements),
    });
  } catch (err) {
    console.error('me-data error:', err);
    res.status(500).json({ msg: err.message, stack: err.stack });
  }
});

router.post('/record', validateBody(attendanceUpsertSchema), upsertEmployeeRecord);

module.exports = router;
