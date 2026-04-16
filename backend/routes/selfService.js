const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const ProfileUpdateRequest = require('../models/ProfileUpdateRequest');
const EmployeeDocument = require('../models/EmployeeDocument');
const AdminNotification = require('../models/AdminNotification');
const { logAudit } = require('../lib/auditHelper');

const router = express.Router();
router.use(auth);

const docUploadsRoot = path.join(__dirname, '..', '..', '..', 'private_uploads', 'documents');
fs.mkdirSync(docUploadsRoot, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, docUploadsRoot),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safe = `${String(req.user.id)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || (file.mimetype && file.mimetype.startsWith('image/'));
    if (!ok) return cb(new Error('Only PDF and image files are allowed'));
    cb(null, true);
  },
});

function fmt(arr) {
  return arr.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    obj.id = obj._id.toString();
    return obj;
  });
}

router.post('/profile-update', auth.requireRole(['employee', 'manager']), async (req, res) => {
  try {
    const { phone, email, address, emergencyContact } = req.body;
    const changes = {};
    if (phone !== undefined) changes.phone = phone;
    if (email !== undefined) changes.email = email;
    if (address !== undefined) changes.address = address;
    if (emergencyContact) changes.emergencyContact = emergencyContact;

    if (!Object.keys(changes).length) {
      return res.status(400).json({ msg: 'No changes provided' });
    }

    const existing = await ProfileUpdateRequest.findOne({ employeeId: req.user.id, status: 'pending' });
    if (existing) return res.status(400).json({ msg: 'You already have a pending profile update request' });

    const request = await ProfileUpdateRequest.create({ employeeId: req.user.id, changes });

    const emp = await Employee.findById(req.user.id);
    await AdminNotification.create({
      type: 'profile_update_request',
      title: 'Profile Update Request',
      titleAr: 'طلب تحديث الملف الشخصي',
      body: `${emp ? emp.name : 'Employee'} requested profile changes: ${Object.keys(changes).join(', ')}.`,
      bodyAr: `${emp ? emp.name : 'موظف'} طلب تحديث: ${Object.keys(changes).join(', ')}.`,
      ref: { kind: 'profile_update', id: request._id.toString() },
    });

    res.json({ msg: 'Profile update request submitted', request });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/profile-updates', auth.requireRole('admin'), async (req, res) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    const items = await ProfileUpdateRequest.find(q).sort({ createdAt: -1 }).populate('employeeId', 'name eid');
    res.json(fmt(items));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/profile-updates/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Status must be approved or rejected' });
    }
    const request = await ProfileUpdateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Not found' });
    if (request.status !== 'pending') return res.status(400).json({ msg: 'Already processed' });

    request.status = status;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    if (reviewNote) request.reviewNote = reviewNote;
    await request.save();

    if (status === 'approved') {
      const updateFields = {};
      const changes = request.changes;
      if (changes.phone !== undefined) updateFields.phone = changes.phone;
      if (changes.email !== undefined) updateFields.email = changes.email;
      if (changes.address !== undefined) updateFields.address = changes.address;
      if (changes.emergencyContact) updateFields.emergencyContact = changes.emergencyContact;
      await Employee.findByIdAndUpdate(request.employeeId, { $set: updateFields });
      logAudit(req, 'profile_update_approved', 'Employee', String(request.employeeId), null, updateFields);
    }

    await AdminNotification.create({
      type: status === 'approved' ? 'profile_update_approved' : 'profile_update_rejected',
      title: status === 'approved' ? 'Profile Update Approved' : 'Profile Update Rejected',
      titleAr: status === 'approved' ? 'تم قبول تحديث الملف الشخصي' : 'تم رفض تحديث الملف الشخصي',
      body: `Your profile update request has been ${status}.`,
      bodyAr: `طلب تحديث ملفك الشخصي تم ${status === 'approved' ? 'قبوله' : 'رفضه'}.`,
      ref: { kind: 'profile_update', id: request._id.toString() },
      recipientId: String(request.employeeId),
    });

    res.json({ msg: 'Success', request });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'File is required' });
    const { title, category, employeeId, expiresAt, notes } = req.body;
    if (!title) return res.status(400).json({ msg: 'Title is required' });

    const targetEmpId = req.user.role === 'admin' && employeeId ? employeeId : req.user.id;

    const doc = await EmployeeDocument.create({
      employeeId: targetEmpId,
      title,
      category: category || 'other',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      expiresAt: expiresAt || undefined,
      uploadedBy: req.user.id,
      uploadedByRole: req.user.role,
      notes,
    });

    res.json({ msg: 'Document uploaded', document: doc });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/documents', async (req, res) => {
  try {
    const q = {};
    if (req.user.role === 'admin') {
      if (req.query.employeeId) q.employeeId = req.query.employeeId;
    } else {
      q.employeeId = req.user.id;
    }
    const items = await EmployeeDocument.find(q).sort({ createdAt: -1 }).populate('employeeId', 'name eid');
    res.json(fmt(items));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/documents/:id/download', async (req, res) => {
  try {
    const doc = await EmployeeDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Not found' });
    if (req.user.role !== 'admin' && String(doc.employeeId) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    const filePath = path.join(docUploadsRoot, doc.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found on disk' });
    res.download(filePath, doc.originalName || doc.filename);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await EmployeeDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Not found' });
    if (req.user.role !== 'admin' && String(doc.employeeId) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    const filePath = path.join(docUploadsRoot, doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await EmployeeDocument.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/documents/expiring', auth.requireRole('admin'), async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days, 10) || 30;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysAhead);
    const items = await EmployeeDocument.find({
      expiresAt: { $lte: deadline, $gte: new Date() },
    }).sort({ expiresAt: 1 }).populate('employeeId', 'name eid');
    res.json(fmt(items));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ msg: 'File must be 10MB or less' });
  return res.status(400).json({ msg: err.message || 'Upload error' });
});

module.exports = router;
