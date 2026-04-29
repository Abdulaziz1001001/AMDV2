const cron = require('node-cron');
const SystemSetting = require('../models/SystemSetting');
const { markAbsenteesForDate } = require('../controllers/attendanceController');

const SETTING_KEY = 'attendance.absenteeScheduler';
const DEFAULT_TRIGGER_TIME = '18:00';
const TZ = 'Asia/Riyadh';

let activeJob = null;
let activeTime = DEFAULT_TRIGGER_TIME;

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function parseTimeToCron(time) {
  const [hour, minute] = String(time).split(':');
  return `${Number(minute)} ${Number(hour)} * * *`;
}

async function getOrCreateSetting() {
  let setting = await SystemSetting.findOne({ key: SETTING_KEY });
  if (!setting) {
    setting = await SystemSetting.create({
      key: SETTING_KEY,
      absenteeTriggerTime: DEFAULT_TRIGGER_TIME,
    });
  }
  return setting;
}

async function runScheduledCloseDay() {
  const date = todayStr();
  try {
    const count = await markAbsenteesForDate(date);
    console.log(`[absentee-scheduler] ${count} absent record(s) created for ${date}`);
  } catch (err) {
    if (err && err.code === 11000) {
      console.log(`[absentee-scheduler] 0 absent record(s) created for ${date}`);
      return;
    }
    console.error('[absentee-scheduler] run failed:', err.message);
  }
}

function scheduleForTime(triggerTime) {
  if (activeJob) activeJob.stop();
  activeTime = triggerTime;
  const expression = parseTimeToCron(triggerTime);
  activeJob = cron.schedule(expression, () => {
    void runScheduledCloseDay();
  }, { timezone: TZ });
}

async function initAbsenteeScheduler() {
  const setting = await getOrCreateSetting();
  scheduleForTime(setting.absenteeTriggerTime || DEFAULT_TRIGGER_TIME);
}

async function updateAbsenteeTriggerTime(nextTime) {
  await SystemSetting.findOneAndUpdate(
    { key: SETTING_KEY },
    { $set: { absenteeTriggerTime: nextTime } },
    { upsert: true, new: true },
  );
  scheduleForTime(nextTime);
}

async function getAbsenteeTriggerTime() {
  const setting = await getOrCreateSetting();
  return setting.absenteeTriggerTime || DEFAULT_TRIGGER_TIME;
}

function getSchedulerState() {
  return { triggerTime: activeTime };
}

module.exports = {
  initAbsenteeScheduler,
  updateAbsenteeTriggerTime,
  getAbsenteeTriggerTime,
  getSchedulerState,
};
