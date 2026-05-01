# ⏱ ShiftWatch — Shift-Based Staff Attendance System

A production-ready, full-stack attendance management system with shift-based scheduling, real-time punch tracking, and admin controls.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  Login → Dashboard → Employees → Attendance → Reports        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (REST API)
┌────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Node/Express)                     │
│  Auth → Shifts → Employees → Attendance → Reports            │
│  JWT Middleware → Route Guards → Controllers → DB            │
└────────────────────────┬────────────────────────────────────┘
                         │ pg Pool
┌────────────────────────▼────────────────────────────────────┐
│                     PostgreSQL Database                       │
│  users | shifts | employees | attendance | attendance_logs   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

```
users           → Auth accounts (admin / employee)
shifts          → Morning / Evening shift definitions
employees       → Staff records linked to users + shifts
attendance      → One record per employee per day
attendance_logs → Raw punch audit log (IN/OUT events)
```

**Key Relationships:**
- `employees.user_id` → `users.id` (login account)
- `employees.shift_id` → `shifts.id` (assigned shift)
- `attendance.employee_id` → `employees.id`
- `attendance.shift_id` → `shifts.id` (snapshot at time of attendance)
- `attendance_logs.attendance_id` → `attendance.id`

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/profile` | Get current user profile |
| PUT | `/api/auth/change-password` | Change password |

### Shifts
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/shifts` | All users |
| GET | `/api/shifts/:id` | All users |
| PUT | `/api/shifts/:id` | Admin only |

### Employees
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/employees` | Admin only |
| GET | `/api/employees/:id` | All |
| POST | `/api/employees` | Admin only |
| PUT | `/api/employees/:id` | Admin only |
| DELETE | `/api/employees/:id` | Admin only (soft delete) |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/mark-in` | Mark IN (with late detection) |
| POST | `/api/attendance/mark-out` | Mark OUT (with early-leave detection) |
| GET | `/api/attendance/today` | Today's status |
| GET | `/api/attendance/dashboard` | Admin dashboard data |
| GET | `/api/attendance/report/daily` | Daily full report |
| GET | `/api/attendance/report/shift` | Shift-wise report |
| GET | `/api/attendance/report/employee/:id` | Employee history |
| PUT | `/api/attendance/override/:id` | Admin override |
| POST | `/api/attendance/manual` | Admin manual entry |

---

## 🎯 Attendance Logic

```
Mark IN:
  IF current_time > (shift_in_time + grace_minutes)
    → is_late = TRUE, late_minutes = (current - shift_in)
  ELSE → is_late = FALSE

  IF already has IN without OUT → ERROR (double IN prevented)

Mark OUT:
  IF no IN record today → ERROR (OUT without IN prevented)
  IF already has OUT → ERROR
  IF current_time < shift_out_time
    → is_early_leave = TRUE, early_leave_minutes = (shift_out - current)
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the project
cd shiftwatch

# Start all services
docker-compose up -d

# Access:
# Frontend: http://localhost:3000
# API:      http://localhost:5000/api
# DB:       localhost:5432
```

### Option 2: Manual Setup

#### 1. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE shiftwatch_db;"

# Run schema (includes seed data)
psql -U postgres -d shiftwatch_db -f database/schema.sql
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DB credentials and JWT secret

# Start development server
npm run dev

# Start production server
npm start
```

#### 3. Frontend Setup
```bash
cd frontend
npm install

# For development (proxies to localhost:5000)
npm start

# For production build
npm run build
```

---

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Employee | `john.doe` | `Emp@12345` |
| Employee | `jane.smith` | `Emp@12345` |
| Employee | `bob.wilson` | `Emp@12345` |
| Employee | `alice.chen` | `Emp@12345` |
| Employee | `raj.kumar` | `Emp@12345` |

---

## 📋 Sample Shifts

| Shift | IN Time | OUT Time | Grace |
|-------|---------|----------|-------|
| Morning Shift | 09:00 | 17:00 | 10 min |
| Evening Shift | 14:00 | 22:00 | 10 min |

---

## 🗂 Project Structure

```
shiftwatch/
├── database/
│   └── schema.sql              # Full DB schema + seed data
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # PostgreSQL pool connection
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── shiftController.js
│   │   │   ├── employeeController.js
│   │   │   └── attendanceController.js
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT authentication
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   └── index.js        # All API routes
│   │   └── server.js           # Express app entry point
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/           # Login page
│   │   │   ├── dashboard/      # Admin dashboard
│   │   │   ├── employees/      # Employee CRUD
│   │   │   ├── attendance/     # Mark IN/OUT, admin view
│   │   │   ├── reports/        # Daily, shift, employee reports
│   │   │   └── admin/          # Shift configuration
│   │   ├── context/
│   │   │   └── AuthContext.js  # Global auth state
│   │   ├── styles/
│   │   │   └── globals.css     # Design system
│   │   ├── utils/
│   │   │   └── api.js          # Axios API service
│   │   └── App.js              # Router + route guards
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker-compose.yml
```

---

## 🔐 Security Features
- JWT authentication with 8h expiry
- Bcrypt password hashing (10 rounds)
- Rate limiting (200 req/15min, 20 login/15min)
- Helmet.js security headers
- CORS configured to frontend origin only
- Role-based access control (admin / employee)
- SQL injection prevention via parameterized queries

---

## 🌐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `shiftwatch_db` |
| `DB_USER` | DB username | `postgres` |
| `DB_PASSWORD` | DB password | — |
| `JWT_SECRET` | JWT signing key (min 32 chars) | — |
| `JWT_EXPIRES_IN` | Token expiry | `8h` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` |
