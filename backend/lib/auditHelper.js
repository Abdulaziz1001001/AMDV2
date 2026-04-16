const AuditLog = require('../models/AuditLog');

async function logAudit(req, action, target, targetId, previousValue, newValue) {
  try {
    await AuditLog.create({
      actor: req.user ? req.user.id : 'system',
      actorRole: req.user ? req.user.role : 'system',
      actorName: req.user ? (req.user.name || '') : 'system',
      action,
      target,
      targetId: targetId || '',
      previousValue,
      newValue,
      ip: req.ip || '',
    });
  } catch (_) {
    /* best-effort, never throw */
  }
}

module.exports = { logAudit };
