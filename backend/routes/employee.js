const express = require('express');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.use(auth);
router.use(auth.requireRole('employee'));

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
    return res.json({ msg: 'Check-in saved successfully', record: newRecord });
  } catch (err) {
    console.error('Record Save Error:', err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
