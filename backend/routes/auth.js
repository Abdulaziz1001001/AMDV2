const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { loginSchema, validateBody } = require('../middleware/validation');
const mongoose = require('mongoose');
const Department = mongoose.models.Department;

const router = express.Router();

router.post('/admin-login', validateBody(loginSchema), async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        username: admin.username,
        email: admin.email || '',
      },
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.post('/emp-login', validateBody(loginSchema), async (req, res) => {
  const { username, password } = req.body;
  try {
    const emp = await Employee.findOne({ username, active: true });
    if (!emp) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, emp.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const isManager = await Department.exists({ managerId: emp._id });
    const userRole = isManager ? 'manager' : 'employee';

    const token = jwt.sign({ id: emp._id, role: userRole }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({
      token,
      user: { id: emp._id, name: emp.name, groupId: emp.groupId, role: userRole },
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
