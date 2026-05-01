const { query, getClient } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { format, parseISO } = require('date-fns');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a TIME string "HH:MM:SS" and a date into a full Date object (local)
 */
function shiftTimeToDate(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Core attendance logic: given actual times and shift config, return flags.
 */
function computeAttendanceFlags(actualIn, actualOut, shift, attendanceDate) {
  const shiftIn  = shiftTimeToDate(attendanceDate, shift.in_time);
  const shiftOut = shiftTimeToDate(attendanceDate, shift.out_time);

  // Add grace period
  const lateThreshold = new Date(shiftIn.getTime() + shift.grace_minutes * 60 * 1000);

  let isLate = false;
  let lateMinutes = 0;
  if (actualIn && actualIn > lateThreshold) {
    isLate = true;
    lateMinutes = Math.round((actualIn - shiftIn) / 60000);
  }

  let isEarlyLeave = false;
  let earlyLeaveMinutes = 0;
  if (actualOut && actualOut < shiftOut) {
    isEarlyLeave = true;
    earlyLeaveMinutes = Math.round((shiftOut - actualOut) / 60000);
  }

  return { isLate, lateMinutes, isEarlyLeave, earlyLeaveMinutes };
}

// ─── Mark IN ──────────────────────────────────────────────────────────────────

// POST /api/attendance/mark-in
const markIn = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Resolve employee
    const { employee_id } = req.body;
    let empId = employee_id;

    // If employee role, always use their own record
    if (req.user.role === 'employee') {
      const empResult = await client.query(
        'SELECT id FROM employees WHERE user_id = $1 AND is_active = true',
        [req.user.id]
      );
      if (!empResult.rows.length) throw new AppError('Employee record not found', 404);
      empId = empResult.rows[0].id;
    }

    if (!empId) throw new AppError('employee_id is required', 400);

    // Load employee + shift
    const empResult = await client.query(
      `SELECT e.*, s.in_time, s.out_time, s.grace_minutes
       FROM employees e JOIN shifts s ON s.id = e.shift_id
       WHERE e.id = $1 AND e.is_active = true`,
      [empId]
    );
    if (!empResult.rows.length) throw new AppError('Employee not found or inactive', 404);
    const emp = empResult.rows[0];

    const today = format(new Date(), 'yyyy-MM-dd');
    const nowUTC = new Date();

    // Check existing attendance
    const existing = await client.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2',
      [empId, today]
    );

    if (existing.rows.length) {
      const att = existing.rows[0];
      if (att.in_time && !att.out_time) {
        throw new AppError('Already marked IN. Please mark OUT first.', 409);
      }
      if (att.in_time && att.out_time) {
        throw new AppError('Attendance already completed for today.', 409);
      }
    }

    // Compute late status
    const shiftIn = shiftTimeToDate(today, emp.in_time);
    const lateThreshold = new Date(shiftIn.getTime() + emp.grace_minutes * 60 * 1000);
    const isLate = nowUTC > lateThreshold;
    const lateMinutes = isLate ? Math.round((nowUTC - shiftIn) / 60000) : 0;

    let attendanceId;

    if (existing.rows.length) {
      // Update existing record (e.g. re-mark after admin reset)
      const result = await client.query(
        `UPDATE attendance SET
           in_time = $1, status = 'present',
           is_late = $2, late_minutes = $3,
           is_overridden = false
         WHERE id = $4 RETURNING id`,
        [nowUTC, isLate, lateMinutes, existing.rows[0].id]
      );
      attendanceId = result.rows[0].id;
    } else {
      // Create new attendance record
      const result = await client.query(
        `INSERT INTO attendance (employee_id, shift_id, attendance_date, in_time, status, is_late, late_minutes)
         VALUES ($1, $2, $3, $4, 'present', $5, $6)
         RETURNING id`,
        [empId, emp.shift_id, today, nowUTC, isLate, lateMinutes]
      );
      attendanceId = result.rows[0].id;
    }

    // Log
    await client.query(
      `INSERT INTO attendance_logs (attendance_id, employee_id, punch_type, punched_at, source, ip_address)
       VALUES ($1, $2, 'in', $3, 'self', $4)`,
      [attendanceId, empId, nowUTC, req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: isLate
        ? `Marked IN — You are ${lateMinutes} minutes late`
        : 'Marked IN — On time',
      data: { attendanceId, isLate, lateMinutes, markedAt: nowUTC },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── Mark OUT ─────────────────────────────────────────────────────────────────

// POST /api/attendance/mark-out
const markOut = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { employee_id } = req.body;
    let empId = employee_id;

    if (req.user.role === 'employee') {
      const empResult = await client.query(
        'SELECT id FROM employees WHERE user_id = $1 AND is_active = true',
        [req.user.id]
      );
      if (!empResult.rows.length) throw new AppError('Employee record not found', 404);
      empId = empResult.rows[0].id;
    }

    if (!empId) throw new AppError('employee_id is required', 400);

    const today = format(new Date(), 'yyyy-MM-dd');
    const nowUTC = new Date();

    // Load today's attendance
    const attResult = await client.query(
      `SELECT a.*, s.out_time, s.in_time, s.grace_minutes
       FROM attendance a JOIN shifts s ON s.id = a.shift_id
       WHERE a.employee_id = $1 AND a.attendance_date = $2`,
      [empId, today]
    );

    if (!attResult.rows.length || !attResult.rows[0].in_time) {
      throw new AppError('No IN record found. Please mark IN first.', 409);
    }

    const att = attResult.rows[0];
    if (att.out_time) {
      throw new AppError('Already marked OUT for today.', 409);
    }

    // Compute early leave
    const shiftOut = shiftTimeToDate(today, att.out_time);
    const isEarlyLeave = nowUTC < shiftOut;
    const earlyLeaveMinutes = isEarlyLeave ? Math.round((shiftOut - nowUTC) / 60000) : 0;

    await client.query(
      `UPDATE attendance SET
         out_time = $1, is_early_leave = $2, early_leave_minutes = $3
       WHERE id = $4`,
      [nowUTC, isEarlyLeave, earlyLeaveMinutes, att.id]
    );

    await client.query(
      `INSERT INTO attendance_logs (attendance_id, employee_id, punch_type, punched_at, source, ip_address)
       VALUES ($1, $2, 'out', $3, 'self', $4)`,
      [att.id, empId, nowUTC, req.ip]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: isEarlyLeave
        ? `Marked OUT — Early by ${earlyLeaveMinutes} minutes`
        : 'Marked OUT — Good work!',
      data: { attendanceId: att.id, isEarlyLeave, earlyLeaveMinutes, markedAt: nowUTC },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── Today Status (for employee) ──────────────────────────────────────────────

// GET /api/attendance/today
const getTodayStatus = async (req, res, next) => {
  try {
    let empId;
    if (req.user.role === 'employee') {
      const empResult = await query(
        'SELECT id FROM employees WHERE user_id = $1', [req.user.id]
      );
      if (!empResult.rows.length) throw new AppError('Employee not found', 404);
      empId = empResult.rows[0].id;
    } else {
      empId = req.query.employee_id;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const result = await query(
      `SELECT a.*, e.full_name, e.employee_code,
              s.name as shift_name, s.in_time as shift_in, s.out_time as shift_out
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       JOIN shifts s ON s.id = a.shift_id
       WHERE a.employee_id = $1 AND a.attendance_date = $2`,
      [empId, today]
    );

    res.json({
      success: true,
      data: result.rows[0] || null,
      date: today,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

// GET /api/attendance/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const date = req.query.date || format(new Date(), 'yyyy-MM-dd');

    // Summary stats
    const statsResult = await query(
      `SELECT
         COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
         COUNT(CASE WHEN a.is_late = true THEN 1 END)     as late_count,
         COUNT(CASE WHEN a.is_early_leave = true THEN 1 END) as early_leave_count,
         (SELECT COUNT(*) FROM employees WHERE is_active = true) as total_employees
       FROM attendance a
       WHERE a.attendance_date = $1`,
      [date]
    );

    const stats = statsResult.rows[0];
    stats.absent_count = parseInt(stats.total_employees) - parseInt(stats.present_count);

    // Present employees
    const presentResult = await query(
      `SELECT a.*, e.full_name, e.employee_code, e.department,
              s.name as shift_name, s.shift_type
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       JOIN shifts s ON s.id = a.shift_id
       WHERE a.attendance_date = $1 AND a.status = 'present'
       ORDER BY a.in_time`,
      [date]
    );

    // Absent employees
    const absentResult = await query(
      `SELECT e.id, e.full_name, e.employee_code, e.department,
              s.name as shift_name, s.shift_type
       FROM employees e
       JOIN shifts s ON s.id = e.shift_id
       WHERE e.is_active = true
         AND e.id NOT IN (
           SELECT employee_id FROM attendance
           WHERE attendance_date = $1 AND status = 'present'
         )
       ORDER BY e.full_name`,
      [date]
    );

    res.json({
      success: true,
      data: {
        date,
        stats,
        present: presentResult.rows,
        absent: absentResult.rows,
        late: presentResult.rows.filter(r => r.is_late),
        earlyLeave: presentResult.rows.filter(r => r.is_early_leave),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

// GET /api/attendance/report/daily?date=YYYY-MM-DD
const getDailyReport = async (req, res, next) => {
  try {
    const date = req.query.date || format(new Date(), 'yyyy-MM-dd');

    const result = await query(
      `SELECT
         e.employee_code, e.full_name, e.department,
         s.name as shift_name, s.shift_type, s.in_time as shift_in, s.out_time as shift_out,
         a.in_time, a.out_time, a.status,
         a.is_late, a.late_minutes,
         a.is_early_leave, a.early_leave_minutes,
         a.is_overridden, a.notes
       FROM employees e
       JOIN shifts s ON s.id = e.shift_id
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = $1
       WHERE e.is_active = true
       ORDER BY s.shift_type, e.full_name`,
      [date]
    );

    res.json({ success: true, data: result.rows, date });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/report/shift?shift_type=morning&date=YYYY-MM-DD
const getShiftReport = async (req, res, next) => {
  try {
    const { shift_type, date } = req.query;
    if (!shift_type) throw new AppError('shift_type is required', 400);
    const reportDate = date || format(new Date(), 'yyyy-MM-dd');

    const result = await query(
      `SELECT
         e.employee_code, e.full_name, e.department,
         a.in_time, a.out_time,
         COALESCE(a.status, 'absent') as status,
         COALESCE(a.is_late, false) as is_late,
         COALESCE(a.late_minutes, 0) as late_minutes,
         COALESCE(a.is_early_leave, false) as is_early_leave,
         COALESCE(a.early_leave_minutes, 0) as early_leave_minutes
       FROM employees e
       JOIN shifts s ON s.id = e.shift_id AND s.shift_type = $1
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = $2
       WHERE e.is_active = true
       ORDER BY e.full_name`,
      [shift_type, reportDate]
    );

    res.json({ success: true, data: result.rows, date: reportDate, shift_type });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/report/employee/:id?from=YYYY-MM-DD&to=YYYY-MM-DD
const getEmployeeReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    // Employees can only view their own report
    if (req.user.role === 'employee') {
      const empResult = await query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
      if (!empResult.rows.length || empResult.rows[0].id !== id) {
        throw new AppError('Access denied', 403);
      }
    }

    const fromDate = from || format(new Date(new Date().setDate(1)), 'yyyy-MM-dd');
    const toDate = to || format(new Date(), 'yyyy-MM-dd');

    const empResult = await query(
      `SELECT e.*, s.name as shift_name, s.shift_type, s.in_time as shift_in, s.out_time as shift_out
       FROM employees e JOIN shifts s ON s.id = e.shift_id WHERE e.id = $1`,
      [id]
    );
    if (!empResult.rows.length) throw new AppError('Employee not found', 404);

    const attResult = await query(
      `SELECT * FROM attendance
       WHERE employee_id = $1 AND attendance_date BETWEEN $2 AND $3
       ORDER BY attendance_date`,
      [id, fromDate, toDate]
    );

    // Compute summary
    const records = attResult.rows;
    const summary = {
      total_days: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.is_late).length,
      early_leave: records.filter(r => r.is_early_leave).length,
    };

    res.json({
      success: true,
      employee: empResult.rows[0],
      summary,
      data: records,
      from: fromDate,
      to: toDate,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin Override ───────────────────────────────────────────────────────────

// PUT /api/attendance/override/:id  (Admin only)
const overrideAttendance = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { in_time, out_time, status, notes, reason } = req.body;
    if (!reason) throw new AppError('Override reason is required', 400);

    // Load existing
    const existing = await client.query(
      `SELECT a.*, s.in_time as shift_in, s.out_time as shift_out, s.grace_minutes
       FROM attendance a JOIN shifts s ON s.id = a.shift_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!existing.rows.length) throw new AppError('Attendance record not found', 404);
    const att = existing.rows[0];

    const actualIn  = in_time  ? new Date(in_time)  : att.in_time  ? new Date(att.in_time)  : null;
    const actualOut = out_time ? new Date(out_time) : att.out_time ? new Date(att.out_time) : null;

    let flags = { isLate: att.is_late, lateMinutes: att.late_minutes, isEarlyLeave: att.is_early_leave, earlyLeaveMinutes: att.early_leave_minutes };
    if (actualIn) {
      flags = computeAttendanceFlags(actualIn, actualOut, att, att.attendance_date);
    }

    const result = await client.query(
      `UPDATE attendance SET
         in_time             = COALESCE($1, in_time),
         out_time            = COALESCE($2, out_time),
         status              = COALESCE($3, status),
         is_late             = $4,
         late_minutes        = $5,
         is_early_leave      = $6,
         early_leave_minutes = $7,
         is_overridden       = true,
         override_by         = $8,
         override_reason     = $9,
         override_at         = NOW(),
         notes               = COALESCE($10, notes)
       WHERE id = $11
       RETURNING *`,
      [
        in_time || null, out_time || null, status || null,
        flags.isLate, flags.lateMinutes, flags.isEarlyLeave, flags.earlyLeaveMinutes,
        req.user.id, reason, notes, req.params.id,
      ]
    );

    // Log override
    if (in_time) {
      await client.query(
        `INSERT INTO attendance_logs (attendance_id, employee_id, punch_type, punched_at, source)
         VALUES ($1, $2, 'in', $3, 'admin')`,
        [att.id, att.employee_id, new Date(in_time)]
      );
    }
    if (out_time) {
      await client.query(
        `INSERT INTO attendance_logs (attendance_id, employee_id, punch_type, punched_at, source)
         VALUES ($1, $2, 'out', $3, 'admin')`,
        [att.id, att.employee_id, new Date(out_time)]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0], message: 'Attendance overridden successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/attendance/manual  (Admin only - create attendance for a specific date)
const manualAttendance = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { employee_id, attendance_date, in_time, out_time, status, notes, reason } = req.body;
    if (!employee_id || !attendance_date) throw new AppError('employee_id and attendance_date required', 400);
    if (!reason) throw new AppError('Reason for manual entry is required', 400);

    const empResult = await client.query(
      `SELECT e.*, s.in_time as shift_in, s.out_time as shift_out, s.grace_minutes, s.id as shift_id
       FROM employees e JOIN shifts s ON s.id = e.shift_id WHERE e.id = $1`,
      [employee_id]
    );
    if (!empResult.rows.length) throw new AppError('Employee not found', 404);
    const emp = empResult.rows[0];

    const actualIn  = in_time  ? new Date(`${attendance_date}T${in_time}`) : null;
    const actualOut = out_time ? new Date(`${attendance_date}T${out_time}`) : null;

    let flags = { isLate: false, lateMinutes: 0, isEarlyLeave: false, earlyLeaveMinutes: 0 };
    if (actualIn) {
      flags = computeAttendanceFlags(actualIn, actualOut, emp, attendance_date);
    }

    const result = await client.query(
      `INSERT INTO attendance
         (employee_id, shift_id, attendance_date, in_time, out_time, status,
          is_late, late_minutes, is_early_leave, early_leave_minutes,
          is_overridden, override_by, override_reason, override_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,NOW(),$13)
       ON CONFLICT (employee_id, attendance_date)
       DO UPDATE SET
         in_time=$4, out_time=$5, status=$6,
         is_late=$7, late_minutes=$8, is_early_leave=$9, early_leave_minutes=$10,
         is_overridden=true, override_by=$11, override_reason=$12, override_at=NOW(), notes=$13
       RETURNING *`,
      [
        employee_id, emp.shift_id, attendance_date, actualIn, actualOut,
        status || (actualIn ? 'present' : 'absent'),
        flags.isLate, flags.lateMinutes, flags.isEarlyLeave, flags.earlyLeaveMinutes,
        req.user.id, reason, notes,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0], message: 'Manual attendance recorded' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/attendance/logs/:attendanceId
const getAttendanceLogs = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT al.*, u.username as admin_name
       FROM attendance_logs al
       LEFT JOIN users u ON u.id = (
         SELECT override_by FROM attendance WHERE id = al.attendance_id
       )
       WHERE al.attendance_id = $1
       ORDER BY al.punched_at`,
      [req.params.attendanceId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  markIn, markOut, getTodayStatus,
  getDashboard, getDailyReport, getShiftReport, getEmployeeReport,
  overrideAttendance, manualAttendance, getAttendanceLogs,
};
