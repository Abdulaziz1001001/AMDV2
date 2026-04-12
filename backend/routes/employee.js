const express = require('express');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Location = require('../models/Location');
const Record = require('../models/Record');
const { upsertPendingLeaveNotification, upsertActivityNotification } = require('../lib/recordNotifications');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole(['employee', 'manager']));

function formatDocs(arr) {
  return arr.map((doc) => ({ ...doc._doc, id: doc._id.toString() }));
}

/** Same shape as /api/admin/all-data, scoped to the logged-in employee (for DB.sync on the portal). */
router.get('/me-data', async (req, res) => {
  try {
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    const allLocs = await Location.find();
    const gid = String(emp.groupId);
    const locations = allLocs.filter((loc) => String(loc.groupId) === gid);

    const records = await Record.find({ employeeId: String(req.user.id) });

    res.json({
      employees: [],
      groups: [],
      locations: formatDocs(locations),
      records: formatDocs(records),
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

    if (checkIn && emp.workStart) {
      const [startHour, startMin] = emp.workStart.split(':').map(Number);
      const expectedStartMinutes = startHour * 60 + startMin;

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

      if (actualMinutes > expectedStartMinutes + 15) {
        finalStatus = 'late';
      }
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
