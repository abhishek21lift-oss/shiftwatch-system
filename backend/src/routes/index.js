const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');

// Controllers
const authCtrl       = require('../controllers/authController');
const empCtrl        = require('../controllers/employeeController');
const shiftCtrl      = require('../controllers/shiftController');
const attCtrl        = require('../controllers/attendanceController');

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login',           authCtrl.login);
router.get ('/auth/profile',         authenticate, authCtrl.getProfile);
router.put ('/auth/change-password', authenticate, authCtrl.changePassword);

// ─── Shifts ───────────────────────────────────────────────────────────────────
router.get('/shifts',     authenticate, shiftCtrl.getAllShifts);
router.get('/shifts/:id', authenticate, shiftCtrl.getShiftById);
router.put('/shifts/:id', authenticate, requireAdmin, shiftCtrl.updateShift);

// ─── Employees ────────────────────────────────────────────────────────────────
router.get   ('/employees',     authenticate, requireAdmin, empCtrl.getAllEmployees);
router.get   ('/employees/:id', authenticate, empCtrl.getEmployeeById);
router.post  ('/employees',     authenticate, requireAdmin, empCtrl.createEmployee);
router.put   ('/employees/:id', authenticate, requireAdmin, empCtrl.updateEmployee);
router.delete('/employees/:id', authenticate, requireAdmin, empCtrl.deactivateEmployee);

// ─── Attendance ───────────────────────────────────────────────────────────────
router.post('/attendance/mark-in',  authenticate, attCtrl.markIn);
router.post('/attendance/mark-out', authenticate, attCtrl.markOut);
router.get ('/attendance/today',    authenticate, attCtrl.getTodayStatus);

// Dashboard & Reports (admin)
router.get('/attendance/dashboard',         authenticate, requireAdmin, attCtrl.getDashboard);
router.get('/attendance/report/daily',      authenticate, requireAdmin, attCtrl.getDailyReport);
router.get('/attendance/report/shift',      authenticate, requireAdmin, attCtrl.getShiftReport);
router.get('/attendance/report/employee/:id', authenticate, attCtrl.getEmployeeReport);
router.get('/attendance/logs/:attendanceId',  authenticate, requireAdmin, attCtrl.getAttendanceLogs);

// Admin overrides
router.put ('/attendance/override/:id', authenticate, requireAdmin, attCtrl.overrideAttendance);
router.post('/attendance/manual',       authenticate, requireAdmin, attCtrl.manualAttendance);

module.exports = router;
