const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('Username and password are required', 400);
    }

    const result = await query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_active,
              e.id as employee_id, e.full_name, e.employee_code, e.shift_id
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.username = $1 OR u.email = $1`,
      [username]
    );

    if (!result.rows.length) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError('Account is deactivated. Contact admin.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        fullName: user.full_name,
        employeeCode: user.employee_code,
        shiftId: user.shift_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.role,
              e.id as employee_id, e.full_name, e.employee_code,
              e.department, e.designation, e.phone,
              s.name as shift_name, s.shift_type, s.in_time, s.out_time
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN shifts s ON s.id = e.shift_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Both current and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getProfile, changePassword };
