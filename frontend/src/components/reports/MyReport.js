import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import { attendanceAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function MyReport() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.employeeId) return;
    setLoading(true);
    try {
      const res = await attendanceAPI.getEmpReport(user.employeeId, { from: fromDate, to: toDate });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.employeeId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const fmt = (ts) => ts ? format(new Date(ts), 'HH:mm') : '—';

  const summary = data?.summary || {};

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Report</h1>
          <p className="page-subtitle">Your personal attendance history</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
          <button className="btn btn-primary" onClick={load}>View Report</button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
          {[
            { label: 'Total Days',  value: summary.total_days,  color: 'var(--accent)'   },
            { label: 'Present',     value: summary.present,     color: 'var(--success)'  },
            { label: 'Absent',      value: summary.absent,      color: 'var(--danger)'   },
            { label: 'Late Days',   value: summary.late,        color: 'var(--warning)'  },
            { label: 'Early Exits', value: summary.early_leave, color: 'var(--info)'     },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color, fontSize: 28 }}>{s.value || 0}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Detail table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : !data?.data?.length ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>No attendance records found for this period</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>IN</th>
                  <th>OUT</th>
                  <th>Status</th>
                  <th>Punctuality</th>
                  <th>Exit</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {format(new Date(r.attendance_date + 'T12:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {format(new Date(r.attendance_date + 'T12:00:00'), 'EEE')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(r.in_time)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmt(r.out_time)}</td>
                    <td>
                      <span className={`badge ${r.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.is_late
                        ? <span className="badge badge-warning">Late +{r.late_minutes}m</span>
                        : r.status === 'present'
                          ? <span className="badge badge-success">On Time</span>
                          : '—'}
                    </td>
                    <td>
                      {r.is_early_leave
                        ? <span className="badge badge-info">Early -{r.early_leave_minutes}m</span>
                        : r.out_time
                          ? <span className="badge badge-success">Full Day</span>
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
