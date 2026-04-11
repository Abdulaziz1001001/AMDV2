/**
 * dateStr: YYYY-MM-DD
 * group: plain object with weekendDays?, ignoreCompanyHolidays?, extraNonWorkDates?
 * policy: plain object with timeZone, defaultWeekendDays, companyHolidays[{date}]
 */

function getWeekdayInTimeZone(dateStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const wd = fmt.format(new Date(utcNoon));
  return map[wd];
}

function effectiveWeekendDays(group, policy) {
  const g = group && Array.isArray(group.weekendDays) && group.weekendDays.length > 0 ? group.weekendDays : null;
  const def = policy && Array.isArray(policy.defaultWeekendDays) ? policy.defaultWeekendDays : [5, 6];
  return g || def;
}

function isCompanyHolidayDate(dateStr, policy) {
  const holidays = policy && policy.companyHolidays ? policy.companyHolidays : [];
  return holidays.some((h) => h && h.date === dateStr);
}

function isExtraNonWorkDate(dateStr, group) {
  const extra = group && Array.isArray(group.extraNonWorkDates) ? group.extraNonWorkDates : [];
  return extra.includes(dateStr);
}

/**
 * @returns {{ working: boolean, calendarDayType: 'workday'|'weekend'|'holiday'|'group_closure' }}
 */
function classifyDay(dateStr, group, policy) {
  const tz = (policy && policy.timeZone) || 'Asia/Riyadh';
  const ignoreHol = group && group.ignoreCompanyHolidays === true;
  const wd = getWeekdayInTimeZone(dateStr, tz);
  const weekends = effectiveWeekendDays(group, policy);
  const onWeekend = weekends.includes(wd);

  if (isExtraNonWorkDate(dateStr, group)) {
    return { working: false, calendarDayType: 'group_closure' };
  }
  if (!ignoreHol && isCompanyHolidayDate(dateStr, policy)) {
    return { working: false, calendarDayType: 'holiday' };
  }
  if (onWeekend) {
    return { working: false, calendarDayType: 'weekend' };
  }
  return { working: true, calendarDayType: 'workday' };
}

function isWorkingDay(dateStr, group, policy) {
  return classifyDay(dateStr, group, policy).working;
}

function formatPolicyForClient(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id ? String(o._id) : undefined;
  delete o._id;
  delete o.__v;
  return o;
}

module.exports = {
  getWeekdayInTimeZone,
  effectiveWeekendDays,
  classifyDay,
  isWorkingDay,
  formatPolicyForClient,
};
