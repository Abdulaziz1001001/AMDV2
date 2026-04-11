const express = require('express');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Group = require('../models/Group');
const Location = require('../models/Location');
const Record = require('../models/Record');
const { ensureWorkPolicy } = require('../lib/ensureWorkPolicy');
const { classifyDay, formatPolicyForClient } = require('../lib/workCalendar');
const { upsertPendingLeaveNotification } = require('../lib/recordNotifications');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole('employee'));

function formatDocs(arr) {
  return arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));
}

function formatEmployeeProfile(emp) {
  if (!emp) return null;
  const o = emp.toObject ? emp.toObject() : { ...emp };
  return {
    id: String(o._id),
    eid: o.eid,
    name: o.name,
    groupId: o.groupId != null ? String(o.groupId) : '',
    workStart: o.workStart,
    workEnd: o.workEnd,
    active: o.active,
  };
}

/** Same shape as /api/admin/all-data, scoped to the logged-in employee (for DB.sync on the portal). */
router.get('/me-data', async (req, res) => {
  try {
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    const policyDoc = await ensureWorkPolicy();

    const allLocs = await Location.find();
    const gid = emp.groupId != null ? String(emp.groupId) : '';
    const locations = gid ? allLocs.filter((loc) => String(loc.groupId) === gid) : [];

    const records = await Record.find({ employeeId: String(req.user.id) });

    let group = null;
    if (emp.groupId) {
      group = await Group.findById(emp.groupId).lean();
      if (group) {
        group = { ...group, id: String(group._id) };
        delete group._id;
        delete group.__v;
      }
    }

    res.json({
      employees: [],
      groups: [],
      locations: formatDocs(locations),
      records: formatDocs(records),
      workPolicy: formatPolicyForClient(policyDoc),
      employeeProfile: formatEmployeeProfile(emp),
      myGroup: group,
    });
  } catch (err) {
    console.error('me-data error:', err);
    res.status(500).json({ msg: 'Server Error' });
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
      excuseCode,
    } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ msg: 'employeeId and date are required' });
    }

    if (String(employeeId) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Cannot record attendance for another user' });
    }

    const mongoose = require('mongoose');
    const RecordModel = mongoose.models.Record;
    const EmployeeModel = mongoose.models.Employee;

    const policyDoc = await ensureWorkPolicy();
    const polPlain = policyDoc.toObject();

    let record = await RecordModel.findOne({ employeeId, date });

    if (record) {
      record.checkOut = checkOut || record.checkOut;
      record.checkOutLat = checkOutLat || record.checkOutLat;
      record.checkOutLng = checkOutLng || record.checkOutLng;

      if (status === 'early_leave') {
        record.status = 'early_leave';
      }

      if (approvalStatus) {
        record.approvalStatus = approvalStatus;
      }

      if (notes) {
        record.notes = record.notes ? record.notes + ' | ' + notes : notes;
      }

      if (attachment) {
        record.attachment = attachment;
      }

      if (excuseCode != null && String(excuseCode).trim()) {
        record.excuseCode = String(excuseCode).trim();
      }

      await record.save();
      if (record.approvalStatus === 'pending') {
        await upsertPendingLeaveNotification(record);
      }
      return res.json({ msg: 'Check-out updated successfully', record });
    }

    const emp = await EmployeeModel.findById(employeeId);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    let groupLean = null;
    if (emp.groupId) {
      groupLean = await Group.findById(emp.groupId).lean();
    }

    const { calendarDayType } = classifyDay(date, groupLean, polPlain);

    let finalStatus = status || 'present';
    const grace = Number(polPlain.lateGraceMinutes) || 15;

    if (checkIn && emp.workStart) {
      const [startHour, startMin] = emp.workStart.split(':').map(Number);
      const expectedStartMinutes = startHour * 60 + startMin;

      const checkInDate = new Date(checkIn);
      const saudiTimeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: polPlain.timeZone || 'Asia/Riyadh',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      let [actualHour, actualMin] = saudiTimeFormatter.format(checkInDate).split(':').map(Number);
      if (actualHour === 24) actualHour = 0;
      const actualMinutes = actualHour * 60 + actualMin;

      if (actualMinutes > expectedStartMinutes + grace) {
        finalStatus = 'late';
      }
    }

    const newRecord = new RecordModel({
      employeeId,
      date,
      checkIn,
      checkInLat,
      checkInLng,
      status: finalStatus,
      approvalStatus: approvalStatus || 'none',
      notes,
      attachment,
      calendarDayType: calendarDayType || 'workday',
      excuseCode: excuseCode != null && String(excuseCode).trim() ? String(excuseCode).trim() : undefined,
    });
    await newRecord.save();
    if (newRecord.approvalStatus === 'pending') {
      await upsertPendingLeaveNotification(newRecord);
    }
    return res.json({ msg: 'Check-in saved successfully', record: newRecord });
  } catch (err) {
    console.error('Record Save Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
