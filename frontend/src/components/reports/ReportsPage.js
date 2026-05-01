import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import { attendanceAPI, employeesAPI } from '../../utils/api';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shiftType, setShiftType] = useState('morning');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employees, setEmployees] = useState([]);
  const [data, setData] = useState(null);
  const [empData, setEmpData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    employeesAPI.getAll().then(r => {
      setEmployees(r.data.data);
      if (r.data.data.length) setSelectedEmp(r.data.data[0].id);
    });
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      if (activeReport === 'daily') {
        const res = await attendanceAPI.getDailyReport({ date });
        setData(res.data.data);
        setEmpData(null);
      } else if (activeReport === 'shift') {
        const res = await attendanceAPI.getShiftReport({ shift_type: shiftType, date });
        setData(res.data.data);
        setEmpData(null);
      } else if (activeReport === 'employee' && selectedEmp) {
        const res = await attendanceAPI.getEmpReport(selectedEmp, { from: fromDate, to: toDate });
        setEmpData(res.data);
        setData(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeReport, date, shiftType, selectedEmp, fromDate, toDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const fmt = (ts) => ts ? format(new Date(ts), 'HH:mm') : '—';

  const tabs = [
    { id: 'daily',    label: '📅 Daily Report' },
    { id: 'shift',    label: '⏰ Shift Report' },
    { id: 'employee', label: '👤 Employee Report' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Attendance analytics and export</p>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`btn ${activeReport === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {(activeReport === 'daily' || activeReport === 'shift') && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Date</label>
              <input type="date" className="form-control" value={date}
                onChange={e => setDate(e.target.value)} style={{ width: 180 }} />
            </div>
          )}
          {activeReport === 'shift' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Shift</label>
              <select className="form-control" value={shiftType}
                onChange={e => setShiftType(e.target.value)} style={{ width: 160 }}>
                <option value="morning">Morning Shift</option>
                <option value="evening">Evening Shift</option>
              </select>
            </div>
          )}
          {activeReport === 'employee' && (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Employee</label>
                <select className="form-control" value={selectedEmp}
                  onChange={e => setSelectedEmp(e.target.value)} style={{ width: 220 }}>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>From</label>
                <input type="date" className="form-control" value={fromDate}
                  onChange={e => setFromDate(e.target.value)} style={{ width: 160 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>To</label>
                <input type="date" className="form-control" value={toDate}
                  onChange={e => setToDate(e.target.value)} style={{ width: 160 }} />
              </div>
            </>
          )}
          <button className="btn btn-primary" onClick={loadReport}>Generate Report</button>
        </div>
      </div>

      {/* Employee Report Summary */}
      {activeReport === 'employee' && empData && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontWeight: 700 }}>{empData.employee?.full_name}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{empData.employee?.shift_name}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
              {fromDate} to {toDate}
            </span>
          </div>
          <div className="grid-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { label: 'Total Days', value: empData.summary?.total_days, color: 'var(--accent)' },
              { label: 'Present',    value: empData.summary?.present,    color: 'var(--success)' },
              { label: 'Absent',     value: empData.summary?.absent,     color: 'var(--danger)' },
              { label: 'Late',       value: empData.summary?.late,       color: 'var(--warning)' },
              { label: 'Early Exit', value: empData.summary?.early_leave, color: 'var(--info)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color: s.color, fontSize: 28 }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : activeReport !== 'employee' && data ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  {activeReport === 'daily' && <th>Shift</th>}
                  <th>Shift Time</th>
                  <th>IN</th>
                  <th>OUT</th>
                  <th>Status</th>
                  <th>Late</th>
                  <th>Early Exit</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={i}>
                    <td><code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{r.employee_code}</code></td>
                    <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                    {activeReport === 'daily' && (
                      <td>
                        <span className={`badge ${r.shift_type === 'morning' ? 'badge-morning' : 'badge-evening'}`}>
                          {r.shift_type === 'morning' ? '☀' : '🌙'} {r.shift_name}
                        </span>
                      </td>
                    )}
                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {(r.shift_in || r.shift_time)?.slice?.(0,5)} – {(r.shift_out || r.shift_time)?.slice?.(0,5)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(r.in_time)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(r.out_time)}</td>
                    <td>
                      <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'absent' ? 'badge-danger' : 'badge-secondary'}`}>
                        {r.status || 'absent'}
                      </span>
                    </td>
                    <td>
                      {r.is_late
                        ? <span className="badge badge-warning">+{r.late_minutes}m</span>
                        : r.status === 'present' ? <span style={{ color: 'var(--success)', fontSize: 12 }}>✓</span> : '—'}
                    </td>
                    <td>
                      {r.is_early_leave
                        ? <span className="badge badge-info">-{r.early_leave_minutes}m</span>
                        : r.out_time ? <span style={{ color: 'var(--success)', fontSize: 12 }}>✓</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeReport === 'employee' && empData?.data ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>IN</th>
                  <th>OUT</th>
                  <th>Status</th>
                  <th>Late</th>
                  <th>Early Exit</th>
                  <th>Overridden</th>
                </tr>
              </thead>
              <tbody>
                {empData.data.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {format(new Date(r.attendance_date + 'T12:00:00'), 'EEE, MMM d yyyy')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(r.in_time)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(r.out_time)}</td>
                    <td>
                      <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'absent' ? 'badge-danger' : 'badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.is_late ? <span className="badge badge-warning">+{r.late_minutes}m</span> : '—'}
                    </td>
                    <td>
                      {r.is_early_leave ? <span className="badge badge-info">-{r.early_leave_minutes}m</span> : '—'}
                    </td>
                    <td>
                      {r.is_overridden
                        ? <span className="badge badge-secondary" title={r.override_reason}>⚡ Yes</span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>Generate a report to see data</p>
          </div>
        )}
      </div>
    </div>
  );
}
