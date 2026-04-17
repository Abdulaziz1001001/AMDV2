const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const Department = require('../models/Department');

async function adminLogin(req, res) {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        username: admin.username,
        email: admin.email || '',
      },
    });
  } catch (err) {
    return res.status(500).send('Server Error');
  }
}

async function employeeLogin(req, res) {
  const { username, password } = req.body;
  try {
    const emp = await Employee.findOne({ username, active: true });
    if (!emp) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, emp.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const isManager = await Department.exists({ managerId: emp._id });
    const userRole = isManager ? 'manager' : 'employee';
    const token = jwt.sign({ id: emp._id, role: userRole }, process.env.JWT_SECRET, { expiresIn: '12h' });

    return res.json({
      token,
      user: {
        id: emp._id,
        name: emp.name,
        username: emp.username,
        eid: emp.eid,
        groupId: emp.groupId,
        departmentId: emp.departmentId,
        workStart: emp.workStart,
        workEnd: emp.workEnd,
        salary: emp.salary,
        role: userRole,
      },
    });
  } catch (err) {
    return res.status(500).send('Server Error');
  }
}

module.exports = {
  adminLogin,
  employeeLogin,
};
