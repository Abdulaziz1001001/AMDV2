const express = require('express');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Department = require('../models/Department');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find({ active: true })
      .select('name eid email phone jobTitle departmentId photoUrl groupId')
      .populate('departmentId', 'name');
    const formatted = employees.map((e) => ({
      id: e._id.toString(),
      name: e.name,
      eid: e.eid,
      email: e.email,
      phone: e.phone,
      jobTitle: e.jobTitle,
      department: e.departmentId ? e.departmentId.name : '',
      departmentId: e.departmentId ? e.departmentId._id.toString() : null,
      photoUrl: e.photoUrl,
      groupId: e.groupId,
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/org-chart', async (req, res) => {
  try {
    const departments = await Department.find().populate('managerId', 'name eid jobTitle photoUrl');
    const employees = await Employee.find({ active: true }).select('name eid jobTitle departmentId photoUrl');

    const chart = departments.map((dept) => ({
      id: dept._id.toString(),
      name: dept.name,
      manager: dept.managerId
        ? { id: dept.managerId._id.toString(), name: dept.managerId.name, eid: dept.managerId.eid, jobTitle: dept.managerId.jobTitle, photoUrl: dept.managerId.photoUrl }
        : null,
      members: employees
        .filter((e) => String(e.departmentId) === String(dept._id) && (!dept.managerId || String(e._id) !== String(dept.managerId._id)))
        .map((e) => ({ id: e._id.toString(), name: e.name, eid: e.eid, jobTitle: e.jobTitle, photoUrl: e.photoUrl })),
    }));

    const unassigned = employees
      .filter((e) => !e.departmentId)
      .map((e) => ({ id: e._id.toString(), name: e.name, eid: e.eid, jobTitle: e.jobTitle, photoUrl: e.photoUrl }));

    res.json({ departments: chart, unassigned });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;
