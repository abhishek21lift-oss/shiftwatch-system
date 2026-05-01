import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { attendanceAPI } from '../../utils/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('present');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getDashboard({ date });
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};

  const statCards = [
    { label: 'Total Employees', value: stats.total_employees || 0, color: 'var(--accent)',   icon: '👥' },
    { label: 'Present Today',   value: stats.present_count  || 0, color: 'var(--success)',  icon: '✅' },
    { label: 'Absent Today',    value: stats.absent_count   || 0, color: 'var(--danger)',   icon: '🚫' },
    { label: 'Late Arrivals',   value: stats.late_count     || 0, color: 'var(--warning)',  icon: '⏰' },
    { label: 'Early Exits',     value: stats.early_leave_count || 0, color: 'var(--info)', icon: '🏃' },
  ];

  const tabs = [
    { id: 'present',    label: 'Present',    count: data?.present?.length     || 0 },
    { id: 'late',       label: 'Late',       count: data?.late?.length        || 0 },
    { id: 'earlyLeave', label: 'Early Exit', count: data?.earlyLeave?.length  || 0 },
    { id: 'absent',     label: 'Absent',     count: data?.absent?.length      || 0 },
  ];

  const currentRows = data?.[activeTab] || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live attendance overview — {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: 'auto' }}
          />
          <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>⚠ {error}</div>}

      {/* Stat cards */}
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: 28 }}>
              {loading ? '—' : s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance Breakdown */}
      <div className="card">
        {/* Tabs */}
        <div style={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
            >
              {tab.label}
              <span style={{
                ...styles.tabBadge,
                background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-elevated)',
                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : currentRows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No records in this category for {date}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Shift</th>
                  {activeTab !== 'absent' && <th>IN Time</th>}
                  {(activeTab === 'present' || activeTab === 'earlyLeave') && <th>OUT Time</th>}
                  {activeTab === 'late' && <th>Late By</th>}
                  {activeTab === 'earlyLeave' && <th>Early By</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, i) => (
                  <tr key={row.id || i}>
                    <td style={{ fontWeight: 600 }}>{row.full_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {row.employee_code}
                    </td>
                    <td>{row.department || '—'}</td>
                    <td>
                      <span className={`badge ${row.shift_type === 'morning' ? 'badge-morning' : 'badge-evening'}`}>
                        {row.shift_type === 'morning' ? '☀' : '🌙'} {row.shift_name}
                      </span>
                    </td>
                    {activeTab !== 'absent' && (
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {row.in_time ? format(new Date(row.in_time), 'HH:mm:ss') : '—'}
                      </td>
                    )}
                    {(activeTab === 'present' || activeTab === 'earlyLeave') && (
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {row.out_time ? format(new Date(row.out_time), 'HH:mm:ss') : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}
                      </td>
                    )}
                    {activeTab === 'late' && (
                      <td>
                        <span className="badge badge-warning">+{row.late_minutes} min</span>
                      </td>
                    )}
                    {activeTab === 'earlyLeave' && (
                      <td>
                        <span className="badge badge-info">-{row.early_leave_minutes} min</span>
                      </td>
                    )}
                    <td>
                      {activeTab === 'absent' ? (
                        <span className="badge badge-danger">Absent</span>
                      ) : (
                        <span className="badge badge-success">Present</span>
                      )}
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

const styles = {
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '0',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    transition: 'all 0.15s',
    fontFamily: 'var(--font-body)',
  },
  tabActive: {
    color: 'var(--accent-light)',
    borderBottomColor: 'var(--accent)',
  },
  tabBadge: {
    padding: '1px 7px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    transition: 'all 0.15s',
  },
};
