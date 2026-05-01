const bcrypt = require('bcryptjs');
const { query, getClient } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// GET /api/employees
const getAllEmployees = async (req, res, next) => {
  try {
    const { shift, department, is_active, search } = req.query;
    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (is_active !== undefined) {
      conditions.push(`e.is_active = $${paramIdx++}`);
      params.push(is_active === 'true');
    } else {
      conditions.push(`e.is_active = true`);
    }

    if (shift) {
      conditions.push(`s.shift_type = $${paramIdx++}`);
      params.push(shift);
    }

    if (department) {
      conditions.push(`e.department ILIKE $${paramIdx++}`);
      params.push(`%${department}%`);
    }

    if (search) {
      conditions.push(`(e.full_name ILIKE $${paramIdx} OR e.employee_code ILIKE $${paramIdx} OR e.email ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT e.*, s.name as shift_name, s.shift_type, s.in_time, s.out_time, s.grace_minutes
       FROM employees e
       JOIN shifts s ON s.id = e.shift_id
       ${whereClause}
       ORDER BY e.full_name`,
      params
    );

    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.*, s.name as shift_name, s.shift_type, s.in_time, s.out_time
       FROM employees e
       JOIN shifts s ON s.id = e.shift_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError('Employee not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/employees  (Admin only)
const createEmployee = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      full_name, email, phone, department, designation,
      shift_id, join_date, employee_code,
      username, password,
    } = req.body;

    if (!full_name || !email || !shift_id || !username || !password) {
      throw new AppError('full_name, email, shift_id, username, and password are required', 400);
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    // Check shift exists
    const shiftCheck = await client.query('SELECT id FROM shifts WHERE id = $1', [shift_id]);
    if (!shiftCheck.rows.length) throw new AppError('Shift not found', 404);

    // Create user account
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'employee') RETURNING id`,
      [username, email, passwordHash]
    );
    const userId = userResult.rows[0].id;

    // Generate employee code if not provided
    const code = employee_code || `EMP${Date.now().toString().slice(-6)}`;

    // Create employee
    const empResult = await client.query(
      `INSERT INTO employees (user_id, employee_code, full_name, email, phone, department, designation, shift_id, join_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, code, full_name, email, phone, department, designation, shift_id, join_date || new Date()]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: empResult.rows[0],
      message: 'Employee created successfully',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PUT /api/employees/:id  (Admin only)
const updateEmployee = async (req, res, next) => {
  try {
    const { full_name, phone, department, designation, shift_id, is_active } = req.body;

    if (shift_id) {
      const shiftCheck = await query('SELECT id FROM shifts WHERE id = $1', [shift_id]);
      if (!shiftCheck.rows.length) throw new AppError('Shift not found', 404);
    }

    const result = await query(
      `UPDATE employees SET
         full_name   = COALESCE($1, full_name),
         phone       = COALESCE($2, phone),
         department  = COALESCE($3, department),
         designation = COALESCE($4, designation),
         shift_id    = COALESCE($5, shift_id),
         is_active   = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [full_name, phone, department, designation, shift_id, is_active, req.params.id]
    );

    if (!result.rows.length) throw new AppError('Employee not found', 404);
    res.json({ success: true, data: result.rows[0], message: 'Employee updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/employees/:id (soft delete - Admin only)
const deactivateEmployee = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE employees SET is_active = false WHERE id = $1 RETURNING id, full_name`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError('Employee not found', 404);
    res.json({ success: true, message: `Employee ${result.rows[0].full_name} deactivated` });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deactivateEmployee };
