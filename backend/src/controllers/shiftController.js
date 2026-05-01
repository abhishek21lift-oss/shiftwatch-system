const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// GET /api/shifts
const getAllShifts = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, COUNT(e.id) as employee_count
       FROM shifts s
       LEFT JOIN employees e ON e.shift_id = s.id AND e.is_active = true
       GROUP BY s.id
       ORDER BY s.shift_type`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/shifts/:id
const getShiftById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM shifts WHERE id = $1', [req.params.id]);
    if (!result.rows.length) throw new AppError('Shift not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/shifts/:id  (Admin only - update shift times)
const updateShift = async (req, res, next) => {
  try {
    const { name, in_time, out_time, grace_minutes } = req.body;

    if (!in_time || !out_time) {
      throw new AppError('in_time and out_time are required', 400);
    }

    // Validate time format HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(in_time) || !timeRegex.test(out_time)) {
      throw new AppError('Time must be in HH:MM format', 400);
    }

    const result = await query(
      `UPDATE shifts SET
         name = COALESCE($1, name),
         in_time = $2,
         out_time = $3,
         grace_minutes = COALESCE($4, grace_minutes)
       WHERE id = $5
       RETURNING *`,
      [name, in_time, out_time, grace_minutes, req.params.id]
    );

    if (!result.rows.length) throw new AppError('Shift not found', 404);
    res.json({ success: true, data: result.rows[0], message: 'Shift updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllShifts, getShiftById, updateShift };
