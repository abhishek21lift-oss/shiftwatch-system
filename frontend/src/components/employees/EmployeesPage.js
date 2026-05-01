import React, { useState, useEffect, useCallback } from 'react';
import { employeesAPI, shiftsAPI } from '../../utils/api';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, shiftRes] = await Promise.all([
        employeesAPI.getAll({ search, shift: shiftFilter || undefined }),
        shiftsAPI.getAll(),
      ]);
      setEmployees(empRes.data.data);
      setShifts(shiftRes.data.data);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to load employees' });
    } finally {
      setLoading(false);
    }
  }, [search, shiftFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async (emp) => {
    if (!window.confirm(`Deactivate ${emp.full_name}?`)) return;
    try {
      await employeesAPI.deactivate(emp.id);
      setMessage({ type: 'success', text: `${emp.full_name} deactivated` });
      load();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed' });
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{employees.length} active employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditEmployee(null); setShowModal(true); }}>
          + Add Employee
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="form-control"
            placeholder="Search name, code, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select
            className="form-control"
            value={shiftFilter}
            onChange={e => setShiftFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">All Shifts</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
          <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No employees found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Shift</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <code style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {emp.employee_code}
                      </code>
                    </td>
                    <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                    <td>{emp.department || '—'}</td>
                    <td>{emp.designation || '—'}</td>
                    <td>
                      <span className={`badge ${emp.shift_type === 'morning' ? 'badge-morning' : 'badge-evening'}`}>
                        {emp.shift_type === 'morning' ? '☀' : '🌙'} {emp.shift_name}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 4 }}>
                          {emp.in_time?.slice(0,5)} – {emp.out_time?.slice(0,5)}
                        </span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{emp.email}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{emp.phone || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setEditEmployee(emp); setShowModal(true); }}
                        >
                          ✏ Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeactivate(emp)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <EmployeeModal
          employee={editEmployee}
          shifts={shifts}
          onClose={() => { setShowModal(false); setEditEmployee(null); }}
          onSave={() => { setShowModal(false); setEditEmployee(null); load(); }}
          onMessage={setMessage}
        />
      )}
    </div>
  );
}

function EmployeeModal({ employee, shifts, onClose, onSave, onMessage }) {
  const [form, setForm] = useState({
    full_name:   employee?.full_name   || '',
    email:       employee?.email       || '',
    phone:       employee?.phone       || '',
    department:  employee?.department  || '',
    designation: employee?.designation || '',
    shift_id:    employee?.shift_id    || shifts[0]?.id || '',
    username:    '',
    password:    '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (employee) {
        await employeesAPI.update(employee.id, {
          full_name:   form.full_name,
          phone:       form.phone,
          department:  form.department,
          designation: form.designation,
          shift_id:    form.shift_id,
        });
        onMessage({ type: 'success', text: 'Employee updated' });
      } else {
        await employeesAPI.create(form);
        onMessage({ type: 'success', text: 'Employee created' });
      }
      onSave();
    } catch (err) {
      onMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to save employee' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{employee ? 'Edit Employee' : 'Add Employee'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            <div className="form-group">
              <label>Full Name *</label>
              <input className="form-control" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} required disabled={!!employee} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input className="form-control" value={form.department} onChange={e => set('department', e.target.value)} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Designation</label>
              <input className="form-control" value={form.designation} onChange={e => set('designation', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Shift *</label>
              <select className="form-control" value={form.shift_id} onChange={e => set('shift_id', e.target.value)} required>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.in_time?.slice(0,5)} – {s.out_time?.slice(0,5)})</option>
                ))}
              </select>
            </div>
          </div>

          {!employee && (
            <div className="grid-2">
              <div className="form-group">
                <label>Username *</label>
                <input className="form-control" value={form.username} onChange={e => set('username', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password * (min 8 chars)</label>
                <input className="form-control" type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {employee ? 'Update' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
