const express = require('express');
const { loginSchema, validateBody } = require('../middleware/validation');
const { adminLogin, employeeLogin } = require('../controllers/authController');

const router = express.Router();

router.post('/admin-login', validateBody(loginSchema), adminLogin);
router.post('/emp-login', validateBody(loginSchema), employeeLogin);

module.exports = router;
