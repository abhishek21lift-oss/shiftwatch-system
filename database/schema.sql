-- ============================================================
-- ShiftWatch Attendance System - Database Schema
-- PostgreSQL
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS (Auth)
-- ============================================================
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     VARCHAR(50) UNIQUE NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role         VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE shifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(50) UNIQUE NOT NULL,         -- 'Morning', 'Evening'
  shift_type   VARCHAR(20) UNIQUE NOT NULL CHECK (shift_type IN ('morning', 'evening')),
  in_time      TIME NOT NULL,                        -- e.g. 09:00:00
  out_time     TIME NOT NULL,                        -- e.g. 17:00:00
  grace_minutes INT NOT NULL DEFAULT 10,             -- late grace period
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  employee_code VARCHAR(20) UNIQUE NOT NULL,
  full_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  phone        VARCHAR(20),
  department   VARCHAR(100),
  designation  VARCHAR(100),
  shift_id     UUID NOT NULL REFERENCES shifts(id),
  join_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id        UUID NOT NULL REFERENCES shifts(id),
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Raw timestamps
  in_time         TIMESTAMPTZ,
  out_time        TIMESTAMPTZ,

  -- Status flags
  status          VARCHAR(20) NOT NULL DEFAULT 'absent'
                  CHECK (status IN ('present', 'absent', 'half_day')),
  is_late         BOOLEAN NOT NULL DEFAULT false,
  is_early_leave  BOOLEAN NOT NULL DEFAULT false,
  late_minutes    INT DEFAULT 0,
  early_leave_minutes INT DEFAULT 0,

  -- Override / manual correction
  is_overridden   BOOLEAN NOT NULL DEFAULT false,
  override_by     UUID REFERENCES users(id),
  override_reason TEXT,
  override_at     TIMESTAMPTZ,

  -- Notes
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One attendance record per employee per day
  UNIQUE (employee_id, attendance_date)
);

-- ============================================================
-- ATTENDANCE LOGS (raw punch log for audit trail)
-- ============================================================
CREATE TABLE attendance_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  punch_type    VARCHAR(10) NOT NULL CHECK (punch_type IN ('in', 'out')),
  punched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        VARCHAR(20) NOT NULL DEFAULT 'self' CHECK (source IN ('self', 'admin', 'system')),
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_attendance_date         ON attendance(attendance_date);
CREATE INDEX idx_attendance_employee     ON attendance(employee_id);
CREATE INDEX idx_attendance_status       ON attendance(status);
CREATE INDEX idx_attendance_logs_emp     ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_punch   ON attendance_logs(punched_at);
CREATE INDEX idx_employees_shift         ON employees(shift_id);
CREATE INDEX idx_employees_active        ON employees(is_active);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at    BEFORE UPDATE ON shifts    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: Admin@123)
INSERT INTO users (id, username, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@shiftwatch.com',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdBPzesgXO', 'admin');

-- Shifts
INSERT INTO shifts (id, name, shift_type, in_time, out_time, grace_minutes) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Morning Shift', 'morning', '09:00:00', '17:00:00', 10),
  ('10000000-0000-0000-0000-000000000002', 'Evening Shift', 'evening', '14:00:00', '22:00:00', 10);

-- Employee users (password: Emp@12345)
INSERT INTO users (id, username, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000002', 'john.doe',   'john@company.com',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdBPzesgXO', 'employee'),
  ('00000000-0000-0000-0000-000000000003', 'jane.smith', 'jane@company.com',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdBPzesgXO', 'employee'),
  ('00000000-0000-0000-0000-000000000004', 'bob.wilson', 'bob@company.com',    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdBPzesgXO', 'employee'),
  ('00000000-0000-0000-0000-000000000005', 'alice.chen', 'alice@company.com',  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdBPzesgXO', 'employee'),
  ('00000000-0000-0000-0000-000000000006', 'raj.kumar',  'raj@company.com',    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdBPzesgXO', 'employee');

-- Employees
INSERT INTO employees (id, user_id, employee_code, full_name, email, phone, department, designation, shift_id) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'EMP001', 'John Doe',   'john@company.com',  '9876543210', 'Engineering',  'Software Engineer',  '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'EMP002', 'Jane Smith', 'jane@company.com',  '9876543211', 'Design',       'UI/UX Designer',     '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'EMP003', 'Bob Wilson', 'bob@company.com',   '9876543212', 'Operations',   'Operations Manager', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'EMP004', 'Alice Chen', 'alice@company.com', '9876543213', 'Engineering',  'Backend Developer',  '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', 'EMP005', 'Raj Kumar',  'raj@company.com',   '9876543214', 'HR',           'HR Executive',       '10000000-0000-0000-0000-000000000001');
