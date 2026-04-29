const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Group = require('../models/Group');
const Record = require('../models/Record');
const EarlyCheckout = require('../models/EarlyCheckout');
const Project = require('../models/Project');
const { ShiftAssignment, Shift } = require('../models/Shift');
const Overtime = require('../models/Overtime');
const WorkPolicy = require('../models/WorkPolicy');
const AdminNotification = require('../models/AdminNotification');
const { upsertPendingLeaveNotification, upsertActivityNotification } = require('../lib/recordNotifications');
const { haversineDistanceMeters } = require('../lib/geo');
const {
  getAuthorizedWorkSites,
  isInsideAnyAuthorizedGeofence,
  resolveClosestAuthorizedSite,
} = require('../lib/locationAccess');

const MSG_NO_SITES = 'Check-in Failed: No locations assigned. Please contact your Manager.';
const MSG_OUTSIDE = 'Check-in Failed: You are outside the authorized site perimeter.';
const MSG_CHECKOUT_BLOCKED =
  'Checkout blocked. You cannot leave early without an approved request.';

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (m || 0);
}

/**
 * Current wall-clock minutes (0–1439) in a given IANA zone. Used for shift end vs "now" (company: Asia/Riyadh).
 * Do not use server local getHours() — that caused false "early" blocks at scheduled end.
 */
function wallClockMinutesInTimeZone(date, timeZone) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

function riyadhMinutesNow() {
  return wallClockMinutesInTimeZone(new Date(), 'Asia/Riyadh');
}

async function findApprovedEarlyCheckoutForRecord(employeeId, recordId, attendanceDate) {
  const approved = await EarlyCheckout.findOne({
    employeeId,
    attendanceId: recordId,
    status: 'approved',
  })
    .populate('attendanceId', 'date')
    .lean();
  if (!approved) return null;
  const attendance = approved.attendanceId;
  if (!attendance || attendance.date !== attendanceDate) return null;
  return approved;
}

async function getEffectiveShift(employeeId, dateStr) {
  const [assignment, emp] = await Promise.all([
    ShiftAssignment.findOne({ employeeId, date: dateStr }).populate('shiftId'),
    Employee.findById(employeeId).select('workStart workEnd').lean(),
  ]);

  if (assignment && assignment.shiftId) {
    const rosterEnd = assignment.shiftId.endTime;
    /** When both roster and profile exist, admin-set workEnd wins for checkout deadline (not roster end). */
    const effectiveEnd = emp && emp.workEnd ? emp.workEnd : rosterEnd;
    const mergedEnd = !!(emp && emp.workEnd && String(effectiveEnd) !== String(rosterEnd));
    return {
      startTime: assignment.shiftId.startTime,
      endTime: effectiveEnd,
      source: mergedEnd ? 'roster_employee_end' : 'roster',
    };
  }

  /** Admin-set hours on the employee profile override the company default shift when no roster row exists. */
  if (emp && emp.workStart && emp.workEnd) {
    return { startTime: emp.workStart, endTime: emp.workEnd, source: 'employee' };
  }

  const defaultShift = await Shift.findOne({ isDefault: true });
  if (defaultShift) {
    return { startTime: defaultShift.startTime, endTime: defaultShift.endTime, source: 'default_shift' };
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
      lat,
      lng,
    } = req.body;

    if (String(employeeId) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Cannot record attendance for another user' });
    }
    if (!mongoose.isValidObjectId(String(employeeId))) {
      return res.status(400).json({ msg: 'Invalid employee id' });
    }
    const empOid = new mongoose.Types.ObjectId(String(employeeId));

    let record = await Record.findOne({ employeeId: empOid, date });

    /** Set when processing checkout geofence (reuse for checkout location name). */
    let sitesCheckout = null;
    /** True when checkout happens before shift end with an approved early-leave request. */
    let checkoutIsEarlyApproved = false;

    if (record) {
      if (checkOut && status === 'early_leave') {
        return res.status(400).json({ msg: 'Early checkouts must go through /api/checkouts/early' });
      }

      if (checkOut) {
        const empCo = await Employee.findById(empOid);
        if (!empCo) return res.status(404).json({ msg: 'Employee not found' });
        sitesCheckout = await getAuthorizedWorkSites(empCo);
        const approvedEarlyCheckoutToday = await findApprovedEarlyCheckoutForRecord(empOid, record._id, date);

        const shiftEarly = await getEffectiveShift(empOid, date);
        const endMinEarly = shiftEarly ? parseTimeToMinutes(shiftEarly.endTime) : null;
        const currMinEarly = riyadhMinutesNow();
        const isEarlyCheckout = endMinEarly !== null && currMinEarly < endMinEarly;

        let earlyCheckoutDoc = null;
        if (isEarlyCheckout) {
          earlyCheckoutDoc = await EarlyCheckout.findOne({ attendanceId: record._id });
          if (!earlyCheckoutDoc || earlyCheckoutDoc.status !== 'approved') {
            return res.status(403).json({ msg: MSG_CHECKOUT_BLOCKED });
          }
          checkoutIsEarlyApproved = true;
        }

        const outLat = lat ?? checkOutLat;
        const outLng = lng ?? checkOutLng;
        const hasOutCoords =
          outLat != null &&
          outLng != null &&
          Number.isFinite(Number(outLat)) &&
          Number.isFinite(Number(outLng));

        if (!approvedEarlyCheckoutToday) {
          if (sitesCheckout.locations.length + sitesCheckout.projects.length === 0) {
            return res.status(403).json({ msg: MSG_NO_SITES });
          }
          if (!hasOutCoords) {
            return res.status(400).json({ msg: 'GPS coordinates are required for check-out.' });
          }
          if (!isInsideAnyAuthorizedGeofence(outLat, outLng, sitesCheckout.locations, sitesCheckout.projects)) {
            return res.status(403).json({ msg: MSG_OUTSIDE });
          }
        }
      }

      if (checkOut && !record.checkOut) {
        const shift = await getEffectiveShift(empOid, date);
        const endMin = shift ? parseTimeToMinutes(shift.endTime) : null;
        const currMin = riyadhMinutesNow();
        if (endMin !== null && currMin > endMin) {
          const extraMinutes = currMin - endMin;
          if (extraMinutes >= 5) {
            record.overtimeMinutes = extraMinutes;
            try {
              const existing = await Overtime.findOne({ employeeId: empOid, date });
              if (!existing) {
                const policy = await WorkPolicy.findOne({ key: 'company' });
                const ot = await Overtime.create({
                  employeeId: empOid,
                  attendanceId: record._id,
                  date,
                  extraMinutes,
                  reason: 'Auto-detected on checkout',
                  rateMultiplier: policy ? policy.overtimeRateMultiplier || 1.5 : 1.5,
                });
                const emp = await Employee.findById(empOid);
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

      const completingFirstCheckout = !!(checkOut && !record.checkOut);
      record.checkOut = checkOut || record.checkOut;
      record.checkOutLat = checkOutLat || record.checkOutLat;
      record.checkOutLng = checkOutLng || record.checkOutLng;

      if (completingFirstCheckout && checkoutIsEarlyApproved) {
        record.status = 'early_leave';
      }

      const outLat = lat ?? checkOutLat;
      const outLng = lng ?? checkOutLng;
      if (sitesCheckout && outLat != null && outLng != null) {
        const hit = resolveClosestAuthorizedSite(Number(outLat), Number(outLng), sitesCheckout.locations, sitesCheckout.projects);
        const checkoutName = hit ? hit.doc.name || '' : '';
        const baseName = record.locationName || '';
        if (checkoutName && checkoutName !== baseName) {
          record.checkoutLocationName = checkoutName;
        }
      }

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

    const emp = await Employee.findById(empOid);
    if (!emp) return res.status(404).json({ msg: 'Employee not found' });

    if (!checkIn) {
      return res.status(400).json({ msg: 'Check-in time is required for a new attendance record.' });
    }

    const sites = await getAuthorizedWorkSites(emp);
    if (sites.locations.length + sites.projects.length === 0) {
      return res.status(403).json({ msg: MSG_NO_SITES });
    }

    const inLat = lat ?? checkInLat;
    const inLng = lng ?? checkInLng;
    if (inLat == null || inLng == null || !Number.isFinite(Number(inLat)) || !Number.isFinite(Number(inLng))) {
      return res.status(400).json({ msg: 'GPS coordinates are required for check-in.' });
    }
    if (!isInsideAnyAuthorizedGeofence(inLat, inLng, sites.locations, sites.projects)) {
      return res.status(403).json({ msg: MSG_OUTSIDE });
    }

    let finalStatus = status || 'present';
    const shift = await getEffectiveShift(empOid, date);
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
    if (resolvedProjectId) {
      const ok = sites.projects.some((p) => String(p._id) === String(resolvedProjectId));
      if (!ok) {
        return res.status(403).json({ msg: 'You are not authorized to check in at this location.' });
      }
    } else {
      let closest = null;
      let closestDist = Infinity;
      for (const p of sites.projects) {
        const dist = haversineDistanceMeters(Number(inLat), Number(inLng), p.lat, p.lng);
        const radius = p.radius || 500;
        if (dist <= radius && dist < closestDist) {
          closest = p;
          closestDist = dist;
        }
      }
      if (closest) resolvedProjectId = closest._id;
    }

    let locationName;
    const site = resolveClosestAuthorizedSite(Number(inLat), Number(inLng), sites.locations, sites.projects);
    if (site) {
      locationName = site.doc.name || '';
    }
    if (!locationName && resolvedProjectId) {
      const proj = await Project.findById(resolvedProjectId);
      if (proj) locationName = proj.name || '';
    }

    const newRecord = new Record({
      employeeId: empOid,
      date,
      checkIn,
      checkInLat,
      checkInLng,
      status: finalStatus,
      approvalStatus: approvalStatus || 'none',
      notes,
      attachment,
      projectId: resolvedProjectId,
      locationName,
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

async function markAbsenteesForDate(date) {
  const [employees, groups, policy, existingRecords] = await Promise.all([
    Employee.find({ active: true }),
    Group.find(),
    WorkPolicy.findOne({ key: 'company' }),
    Record.find({ date }),
  ]);

  const checkedInIds = new Set(existingRecords.map((r) => String(r.employeeId)));
  const absentees = [];

  for (const emp of employees) {
    if (checkedInIds.has(String(emp._id))) continue;
    if (!isWorkingDay(date, emp.groupId, policy, groups)) continue;
    absentees.push({
      employeeId: emp._id,
      date,
      status: 'absent',
      approvalStatus: 'none',
    });
  }

  if (absentees.length) {
    await Record.insertMany(absentees, { ordered: false });
  }
  return absentees.length;
}

async function closeDay(req, res) {
  const date = req.body.date || todayStr();
  try {
    const count = await markAbsenteesForDate(date);
    return res.json({
      msg: `${count} absent record(s) created for ${date}`,
      count,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.json({ msg: `0 absent record(s) created for ${date}`, count: 0 });
    }
    return res.status(500).json({ msg: err.message });
  }
}

module.exports = {
  upsertEmployeeRecord,
  closeDay,
  markAbsenteesForDate,
};
