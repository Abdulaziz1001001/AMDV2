const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const SafetyIncident = require('../models/SafetyIncident');
const Employee = require('../models/Employee');
const AdminNotification = require('../models/AdminNotification');
const { logAudit } = require('../lib/auditHelper');

const router = express.Router();
router.use(auth);

const photosRoot = path.join(__dirname, '..', '..', '..', 'private_uploads', 'safety-photos');
fs.mkdirSync(photosRoot, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, photosRoot),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = file.mimetype && file.mimetype.startsWith('image/');
    if (!ok) return cb(new Error('Only image files are allowed'));
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

router.post('/', upload.array('photos', 5), async (req, res) => {
  try {
    const { date, description, severity, projectId, location } = req.body;
    if (!description) return res.status(400).json({ msg: 'Description is required' });

    const emp = await Employee.findById(req.user.id);
    const incident = await SafetyIncident.create({
      reporterId: req.user.id,
      reporterName: emp ? emp.name : 'Unknown',
      projectId: projectId || undefined,
      date: date || new Date().toISOString().slice(0, 10),
      description,
      severity: severity || 'medium',
      location,
      photos: req.files ? req.files.map((f) => f.filename) : [],
    });

    await AdminNotification.create({
      type: 'safety_incident',
      title: `Safety Incident — ${(severity || 'medium').toUpperCase()}`,
      titleAr: `حادث سلامة — ${severity || 'medium'}`,
      body: `${emp ? emp.name : 'Employee'} reported: ${description.slice(0, 80)}`,
      bodyAr: `${emp ? emp.name : 'موظف'} أبلغ عن حادث: ${description.slice(0, 80)}`,
      ref: { kind: 'safety_incident', id: incident._id.toString() },
    });

    res.json({ msg: 'Incident reported', incident });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.severity) q.severity = req.query.severity;
    if (req.query.projectId) q.projectId = req.query.projectId;
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      q.reporterId = req.user.id;
    }
    const items = await SafetyIncident.find(q).sort({ createdAt: -1 })
      .populate('reporterId', 'name eid')
      .populate('projectId', 'name')
      .limit(200);
    res.json(fmt(items));
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.put('/:id', auth.requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const incident = await SafetyIncident.findById(req.params.id);
    if (!incident) return res.status(404).json({ msg: 'Not found' });

    const prev = incident.status;
    if (status) incident.status = status;
    if (resolution) incident.resolution = resolution;
    if (status === 'resolved' || status === 'closed') {
      incident.resolvedBy = req.user.id;
      incident.resolvedAt = new Date();
    }
    await incident.save();
    logAudit(req, 'safety_incident_update', 'SafetyIncident', incident._id.toString(), { status: prev }, { status });

    await AdminNotification.create({
      type: 'safety_incident_update',
      title: `Safety Incident ${status || 'updated'}`,
      titleAr: `حادث سلامة ${status || 'تحديث'}`,
      body: `Incident #${incident._id.toString().slice(-6)} status: ${incident.status}`,
      bodyAr: `حادث #${incident._id.toString().slice(-6)} الحالة: ${incident.status}`,
      ref: { kind: 'safety_incident', id: incident._id.toString() },
      recipientId: String(incident.reporterId),
    });

    res.json({ msg: 'Updated', incident });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/:id/photo/:filename', async (req, res) => {
  try {
    const filePath = path.join(photosRoot, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'Photo not found' });
    res.sendFile(filePath);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/:id', auth.requireRole('admin'), async (req, res) => {
  try {
    const incident = await SafetyIncident.findById(req.params.id);
    if (!incident) return res.status(404).json({ msg: 'Not found' });
    if (incident.photos && incident.photos.length) {
      incident.photos.forEach((p) => {
        const fp = path.join(photosRoot, p);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });
    }
    await SafetyIncident.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ msg: 'Photo must be 10MB or less' });
  return res.status(400).json({ msg: err.message || 'Upload error' });
});

module.exports = router;
