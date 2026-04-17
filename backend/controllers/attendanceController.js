const Employee = require('../models/Employee');
const Group = require('../models/Group');
const Record = require('../models/Record');
const { ShiftAssignment, Shift } = require('../models/Shift');
const Overtime = require('../models/Overtime');
const WorkPolicy = require('../models/WorkPolicy');
const AdminNotification = require('../models/AdminNotification');
const { upsertPendingLeaveNotification, upsertActivityNotification } = require('../lib/recordNotifications');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function riyadhMinutesNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const riyadh = new Date(utc + 3600000 * 3);
  return riyadh.getHours() * 60 + riyadh.getMinutes();
}

async function getEffectiveShift(employeeId, dateStr) {
  const assignment = await ShiftAssignment.findOne({ employeeId, date: dateStr }).populate('shiftId');
  if (assignment && assignment.shiftId) {
    return { startTime: assignment.shiftId.startTime, endTime: assignment.shiftId.endTime, source: 'roster' };
  }
  const defaultShift = await Shift.findOne({ isDefault: true });
  if (defaultShift) return { startTime: defaultShift.startTime, endTime: defaultShift.endTime, source: 'default_shift' };
  const emp = await Employee.findById(employeeId);
  if (emp && emp.workStart && emp.workEnd) {
    return { startTime: emp.workStart, endTime: emp.workEnd, source: 'employee' };
  }
  return null;
}

async function upsertEmployeeRecord(req, res) {
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

    if (String(employeeId) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Cannot record attendance for another user' });
    }

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
            } catch (_) {
              // best-effort side effects should not break checkout persistence
            }
          }
        }
      }

      record.checkOut = checkOut || record.checkOut;
      record.checkOutLat = checkOutLat || record.checkOutLat;
      record.checkOutLng = checkOutLng || record.checkOutLng;
      if (approvalStatus) record.approvalStatus = approvalStatus;
      if (notes) record.notes = record.notes ? `${record.notes} | ${notes}` : notes;
      if (attachment) record.attachment = attachment;
      await record.save();

      let action = 'checkout';
      if (status === 'early_leave') action = 'leave';
      await upsertActivityNotification(record, action);
      if (record.approvalStatus === 'pending') await upsertPendingLeaveNotification(record);

      return res.json({ msg: 'Check-out updated successfully', record });
    }

    const emp = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    let finalStatus = status || 'present';
    const shift = await getEffectiveShift(employeeId, date);
    const startTime = shift ? shift.startTime : emp.workStart;
    if (checkIn && startTime) {
      const expectedStartMinutes = parseTimeToMinutes(startTime);
      const checkInDate = new Date(checkIn);
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Riyadh',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      let [actualHour, actualMin] = fmt.format(checkInDate).split(':').map(Number);
      if (actualHour === 24) actualHour = 0;
      const actualMinutes = actualHour * 60 + actualMin;
      const policy = await WorkPolicy.findOne({ key: 'company' });
      const grace = policy ? policy.lateGraceMinutes || 15 : 15;
      if (actualMinutes > expectedStartMinutes + grace) finalStatus = 'late';
    }

    let resolvedProjectId = projectId || undefined;
    if (!resolvedProjectId && checkInLat && checkInLng) {
      try {
        const Project = require('../models/Project');
        const activeProjects = await Project.find({ status: 'active', lat: { $exists: true }, lng: { $exists: true } });
        let closest = null;
        let closestDist = Infinity;
        for (const p of activeProjects) {
          const dlat = (Number(p.lat) - Number(checkInLat)) * 111320;
          const dlng = (Number(p.lng) - Number(checkInLng)) * 111320 * Math.cos((Number(checkInLat) * Math.PI) / 180);
          const dist = Math.sqrt(dlat * dlat + dlng * dlng);
          const radius = p.radius || 500;
          if (dist <= radius && dist < closestDist) {
            closest = p;
            closestDist = dist;
          }
        }
        if (closest) resolvedProjectId = closest._id;
      } catch (_) {
        // best-effort project detection
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
      projectId: resolvedProjectId,
    });
    await newRecord.save();
    await upsertActivityNotification(newRecord, 'checkin');

    return res.json({ msg: 'Check-in recorded successfully', record: newRecord });
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
}

function isWorkingDay(dateStr, empGroupId, policy, groups) {
  const d = new Date(dateStr);
  const dow = d.getUTCDay();
  const group = groups.find((g) => String(g._id) === String(empGroupId));
  const weekendDays =
    group && group.weekendDays && group.weekendDays.length
      ? group.weekendDays
      : policy && policy.defaultWeekendDays
      ? policy.defaultWeekendDays
      : [5, 6];
  if (weekendDays.includes(dow)) return false;
  const holidays = policy && policy.companyHolidays ? policy.companyHolidays : [];
  if (!(group && group.ignoreCompanyHolidays)) {
    if (holidays.some((h) => h.date === dateStr)) return false;
  }
  if (group && group.extraNonWorkDates && group.extraNonWorkDates.includes(dateStr)) return false;
  return true;
}

async function closeDay(req, res) {
  try {
    const date = req.body.date || todayStr();
    const [employees, groups, policy, existingRecords] = await Promise.all([
      Employee.find({ active: true }),
      Group.find(),
      WorkPolicy.findOne({ key: 'company' }),
      Record.find({ date }),
    ]);

    const checkedInIds = new Set(existingRecords.map((r) => r.employeeId));
    const absentees = [];

    for (const emp of employees) {
      if (checkedInIds.has(String(emp._id))) continue;
      if (!isWorkingDay(date, emp.groupId, policy, groups)) continue;
      absentees.push({
        employeeId: String(emp._id),
        date,
        status: 'absent',
        approvalStatus: 'none',
      });
    }

    if (absentees.length) {
      await Record.insertMany(absentees, { ordered: false });
    }

    return res.json({
      msg: `${absentees.length} absent record(s) created for ${date}`,
      count: absentees.length,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.json({ msg: `0 absent record(s) created for ${req.body.date || todayStr()}`, count: 0 });
    }
    return res.status(500).json({ msg: err.message });
  }
}

module.exports = {
  upsertEmployeeRecord,
  closeDay,
};
