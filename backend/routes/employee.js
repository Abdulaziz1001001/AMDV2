const express = require('express');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Location = require('../models/Location');
const Record = require('../models/Record');
const { ShiftAssignment, Shift } = require('../models/Shift');
const Overtime = require('../models/Overtime');
const WorkPolicy = require('../models/WorkPolicy');
const AdminNotification = require('../models/AdminNotification');
const { upsertPendingLeaveNotification, upsertActivityNotification } = require('../lib/recordNotifications');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole(['employee', 'manager']));

function formatDocs(arr) {
  return arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));
}

async function getEffectiveShift(employeeId, dateStr) {
  const assignment = await ShiftAssignment.findOne({ employeeId, date: dateStr }).populate('shiftId');
  if (assignment && assignment.shiftId) {
    return { startTime: assignment.shiftId.startTime, endTime: assignment.shiftId.endTime, source: 'roster' };
  }
  const defaultShift = await Shift.findOne({ isDefault: true });
  if (defaultShift) {
    return { startTime: defaultShift.startTime, endTime: defaultShift.endTime, source: 'default_shift' };
  }
  const emp = await Employee.findById(employeeId);
  if (emp && emp.workStart && emp.workEnd) {
    return { startTime: emp.workStart, endTime: emp.workEnd, source: 'employee' };
  }
  return null;
}

function riyadhMinutesNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const riyadh = new Date(utc + 3600000 * 3);
  return riyadh.getHours() * 60 + riyadh.getMinutes();
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Same shape as /api/admin/all-data, scoped to the logged-in employee (for DB.sync on the portal). */
router.get('/me-data', async (req, res) => {
  try {
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    const Announcement = require('../models/Announcement');
    const allLocs = await Location.find();
    const gid = String(emp.groupId);
    const locations = allLocs.filter((loc) => String(loc.groupId) === gid);

    const now = new Date();
    const [records, announcements] = await Promise.all([
      Record.find({ employeeId: String(req.user.id) }),
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
      records: formatDocs(records),
      announcements: formatDocs(announcements),
    });
  } catch (err) {
    console.error('me-data error:', err);
    res.status(500).json({ msg: err.message, stack: err.stack });
  }
});

router.post('/record', async (req, res) => {
  try {
    const {
      employeeId,
      date,
      checkIn,
      checkOut,
      checkInLat,
      checkInLng,
      checkOutLat,
      checkOutLng,
      status,
      notes,
      approvalStatus,
      attachment,
      projectId,
    } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ msg: 'employeeId and date are required' });
    }

    if (String(employeeId) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Cannot record attendance for another user' });
    }

    const mongoose = require('mongoose');
    const Record = mongoose.models.Record;
    const Employee = mongoose.models.Employee;

    let record = await Record.findOne({ employeeId, date });

    if (record) {
      if (checkOut && status === 'early_leave') {
        return res.status(400).json({ msg: 'Early checkouts must go through /api/checkouts/early' });
      }

      if (checkOut && !record.checkOut) {
        const shift = await getEffectiveShift(employeeId, date);
        const endMin = shift ? parseTimeToMinutes(shift.endTime) : null;
        const currMin = riyadhMinutesNow();

        if (endMin !== null && currMin < endMin) {
          return res.status(400).json({ msg: 'Cannot checkout before scheduled time without early checkout request' });
        }

        // Auto-flag overtime if checked out after scheduled end
        if (endMin !== null && currMin > endMin) {
          const extraMinutes = currMin - endMin;
          if (extraMinutes >= 5) {
            record.overtimeMinutes = extraMinutes;
            try {
              const existing = await Overtime.findOne({ employeeId, date });
              if (!existing) {
                const policy = await WorkPolicy.findOne({ key: 'company' });
                const ot = await Overtime.create({
                  employeeId,
                  attendanceId: record._id,
                  date,
                  extraMinutes,
                  reason: 'Auto-detected on checkout',
                  rateMultiplier: policy ? policy.overtimeRateMultiplier || 1.5 : 1.5,
                });
                const emp = await Employee.findById(employeeId);
                await AdminNotification.create({
                  type: 'overtime_pending',
                  title: 'Overtime Request',
                  titleAr: 'طلب عمل إضافي',
                  body: `${emp ? emp.name : 'Employee'} auto-logged ${extraMinutes} min overtime on ${date}.`,
                  bodyAr: `${emp ? emp.name : 'موظف'} سجل تلقائياً ${extraMinutes} دقيقة عمل إضافي في ${date}.`,
                  ref: { kind: 'overtime', id: ot._id.toString() },
                });
              }
            } catch (_) { /* best-effort */ }
          }
        }
      }

      record.checkOut = checkOut || record.checkOut;
      record.checkOutLat = checkOutLat || record.checkOutLat;
      record.checkOutLng = checkOutLng || record.checkOutLng;

      if (approvalStatus) {
        record.approvalStatus = approvalStatus;
      }

      if (notes) {
        record.notes = record.notes ? record.notes + ' | ' + notes : notes;
      }

      if (attachment) {
        record.attachment = attachment;
      }

      await record.save();
      
      let action = 'checkout';
      if (status === 'early_leave') action = 'leave';
      await upsertActivityNotification(record, action);
      if (record.approvalStatus === 'pending') {
        await upsertPendingLeaveNotification(record);
      }
      
      return res.json({ msg: 'Check-out updated successfully', record });
    }

    const emp = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    let finalStatus = status || 'present';

    // Shift-aware late detection
    const shift = await getEffectiveShift(employeeId, date);
    const startTime = shift ? shift.startTime : emp.workStart;
    if (checkIn && startTime) {
      const expectedStartMinutes = parseTimeToMinutes(startTime);

      const checkInDate = new Date(checkIn);
      const saudiTimeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Riyadh',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      let [actualHour, actualMin] = saudiTimeFormatter.format(checkInDate).split(':').map(Number);
      if (actualHour === 24) actualHour = 0;
      const actualMinutes = actualHour * 60 + actualMin;

      const policy = await WorkPolicy.findOne({ key: 'company' });
      const grace = policy ? policy.lateGraceMinutes || 15 : 15;
      if (actualMinutes > expectedStartMinutes + grace) {
        finalStatus = 'late';
      }
    }

    // Auto-detect project by GPS proximity if not provided
    let resolvedProjectId = projectId || undefined;
    if (!resolvedProjectId && checkInLat && checkInLng) {
      try {
        const Project = require('../models/Project');
        const activeProjects = await Project.find({ status: 'active', lat: { $exists: true }, lng: { $exists: true } });
        let closest = null;
        let closestDist = Infinity;
        for (const p of activeProjects) {
          const dlat = (Number(p.lat) - Number(checkInLat)) * 111320;
          const dlng = (Number(p.lng) - Number(checkInLng)) * 111320 * Math.cos(Number(checkInLat) * Math.PI / 180);
          const dist = Math.sqrt(dlat * dlat + dlng * dlng);
          const radius = p.radius || 500;
          if (dist <= radius && dist < closestDist) { closest = p; closestDist = dist; }
        }
        if (closest) resolvedProjectId = closest._id;
      } catch (_) { /* best-effort */ }
    }

    const newRecord = new Record({
      employeeId,
      date,
      checkIn,
      checkInLat,
      checkInLng,
      status: finalStatus,
      approvalStatus: approvalStatus || 'none',
      notes,
      attachment,
      projectId: resolvedProjectId,
    });
    await newRecord.save();
    
    await upsertActivityNotification(newRecord, 'checkin');

    res.json({ msg: 'Check-in recorded successfully', record: newRecord });
  } catch (err) {
    console.error('Record Save Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
