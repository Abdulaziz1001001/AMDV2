const WorkPolicy = require('../models/WorkPolicy');

const DEFAULT_EXCUSES = [
  { code: 'health', labelEn: 'Health emergency', labelAr: 'ظرف صحي طارئ' },
  { code: 'external', labelEn: 'External work assignment', labelAr: 'مهمة عمل خارجية' },
  { code: 'government', labelEn: 'Government appointment', labelAr: 'مراجعة جهة حكومية' },
  { code: 'family', labelEn: 'Family issue', labelAr: 'ظرف عائلي' },
  { code: 'technical', labelEn: 'Technical / work stoppage', labelAr: 'توقف العمل أو عطل فني' },
  { code: 'preapproved', labelEn: 'Pre-approved by management', labelAr: 'إذن مسبق من الإدارة' },
];

async function ensureWorkPolicy() {
  let doc = await WorkPolicy.findOne({ key: 'company' });
  if (!doc) {
    doc = await WorkPolicy.create({
      key: 'company',
      timeZone: 'Asia/Riyadh',
      defaultWeekendDays: [5, 6],
      companyHolidays: [],
      lateGraceMinutes: 15,
      excuseReasons: DEFAULT_EXCUSES,
    });
  } else if (!doc.excuseReasons || doc.excuseReasons.length === 0) {
    doc.excuseReasons = DEFAULT_EXCUSES;
    await doc.save();
  }
  return doc;
}

module.exports = { ensureWorkPolicy, DEFAULT_EXCUSES };
