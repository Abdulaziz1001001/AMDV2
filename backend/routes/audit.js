const express = require('express');
const auth = require('../middleware/authMiddleware');
const AuditLog = require('../models/AuditLog');

const router = express.Router();
router.use(auth);
router.use(auth.requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const { action, actor, from, to, limit: lim } = req.query;
    const q = {};
    if (action) q.action = { $regex: action, $options: 'i' };
    if (actor) q.actor = actor;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to + 'T23:59:59Z');
    }
    const items = await AuditLog.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(lim, 10) || 100, 500))
      .lean();
    res.json(items.map((l) => ({ ...l, id: l._id.toString() })));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
