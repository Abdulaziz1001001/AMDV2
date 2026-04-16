const express = require('express');
const auth = require('../middleware/authMiddleware');
const OnboardingChecklist = require('../models/OnboardingChecklist');
const WorkPolicy = require('../models/WorkPolicy');
const Employee = require('../models/Employee');

const router = express.Router();
router.use(auth);
router.use(auth.requireRole('admin'));

function fmt(arr) {
  return arr.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    obj.id = obj._id.toString();
    return obj;
  });
}

router.get('/', async (req, res) => {
  try {
    const { employeeId, type } = req.query;
    const q = {};
    if (employeeId) q.employeeId = employeeId;
    if (type) q.type = type;
    const items = await OnboardingChecklist.find(q).sort({ createdAt: -1 }).populate('employeeId', 'name eid');
    res.json(fmt(items));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/generate', async (req, res) => {
  try {
    const { employeeId, type } = req.body;
    if (!employeeId || !type) return res.status(400).json({ msg: 'employeeId and type required' });

    const existing = await OnboardingChecklist.findOne({ employeeId, type, completedAt: null });
    if (existing) return res.status(400).json({ msg: 'Active checklist already exists' });

    const policy = await WorkPolicy.findOne({ key: 'company' });
    const labels = type === 'onboarding'
      ? (policy && policy.onboardingItems && policy.onboardingItems.length ? policy.onboardingItems : ['ID Verification', 'Safety Orientation', 'PPE Issued', 'Contract Signed', 'Bank Details Collected'])
      : (policy && policy.offboardingItems && policy.offboardingItems.length ? policy.offboardingItems : ['Final Settlement', 'Asset Return', 'Access Revocation', 'Exit Interview']);

    const items = labels.map((label) => ({ label, done: false }));
    const checklist = await OnboardingChecklist.create({
      employeeId, type, items, createdBy: req.user.id,
    });
    res.json({ msg: 'Checklist created', checklist });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.patch('/:id/item/:itemId', async (req, res) => {
  try {
    const { done } = req.body;
    const checklist = await OnboardingChecklist.findById(req.params.id);
    if (!checklist) return res.status(404).json({ msg: 'Not found' });

    const item = checklist.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    item.done = !!done;
    item.doneAt = done ? new Date() : undefined;
    item.doneBy = done ? req.user.id : undefined;

    const allDone = checklist.items.every((i) => i.done);
    if (allDone) checklist.completedAt = new Date();
    else checklist.completedAt = undefined;

    await checklist.save();
    res.json({ msg: 'Updated', checklist });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await OnboardingChecklist.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
