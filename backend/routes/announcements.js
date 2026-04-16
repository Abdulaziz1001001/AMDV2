const express = require('express');
const auth = require('../middleware/authMiddleware');
const Announcement = require('../models/Announcement');
const Employee = require('../models/Employee');

const router = express.Router();
router.use(auth);

function fmt(arr) {
  return arr.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    obj.id = obj._id.toString();
    return obj;
  });
}

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const q = { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] };

    if (req.user.role !== 'admin') {
      const emp = await Employee.findById(req.user.id);
      q.$and = [
        { $or: [
          { targetType: 'all' },
          ...(emp && emp.departmentId ? [{ targetType: 'department', targetId: String(emp.departmentId) }] : []),
          ...(emp && emp.groupId ? [{ targetType: 'group', targetId: String(emp.groupId) }] : []),
        ]},
      ];
    }

    const items = await Announcement.find(q).sort({ pinned: -1, createdAt: -1 }).limit(50);
    res.json(fmt(items));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/', auth.requireRole('admin'), async (req, res) => {
  try {
    const { id, title, titleAr, body, bodyAr, priority, targetType, targetId, expiresAt, pinned } = req.body;
    if (!title || !body) return res.status(400).json({ msg: 'title and body required' });

    if (id) {
      await Announcement.findByIdAndUpdate(id, { title, titleAr, body, bodyAr, priority, targetType, targetId, expiresAt, pinned });
    } else {
      await Announcement.create({
        title, titleAr, body, bodyAr, priority, targetType, targetId,
        expiresAt: expiresAt || undefined,
        pinned: !!pinned,
        createdBy: req.user.id,
        createdByName: 'Admin',
      });
    }
    res.json({ msg: 'Success' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
