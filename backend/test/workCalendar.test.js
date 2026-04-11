const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyDay, getWeekdayInTimeZone } = require('../lib/workCalendar');

const policy = {
  timeZone: 'Asia/Riyadh',
  defaultWeekendDays: [5, 6],
  companyHolidays: [{ date: '2026-01-01', nameEn: 'New Year' }],
};

test('getWeekdayInTimeZone returns JS weekday 0–6', () => {
  const wd = getWeekdayInTimeZone('2026-04-10', 'Asia/Riyadh');
  assert.equal(wd, 5);
});

test('Friday is non-working with default KSA weekend', () => {
  const r = classifyDay('2026-04-10', null, policy);
  assert.equal(r.working, false);
  assert.equal(r.calendarDayType, 'weekend');
});

test('Wednesday is a working day', () => {
  const r = classifyDay('2026-04-08', null, policy);
  assert.equal(r.working, true);
  assert.equal(r.calendarDayType, 'workday');
});

test('company holiday is non-working', () => {
  const r = classifyDay('2026-01-01', null, policy);
  assert.equal(r.working, false);
  assert.equal(r.calendarDayType, 'holiday');
});

test('group can ignore company holidays', () => {
  const r = classifyDay('2026-01-01', { ignoreCompanyHolidays: true }, policy);
  assert.equal(r.working, true);
  assert.equal(r.calendarDayType, 'workday');
});

test('group extra non-work date', () => {
  const r = classifyDay('2026-04-08', { extraNonWorkDates: ['2026-04-08'] }, policy);
  assert.equal(r.working, false);
  assert.equal(r.calendarDayType, 'group_closure');
});
