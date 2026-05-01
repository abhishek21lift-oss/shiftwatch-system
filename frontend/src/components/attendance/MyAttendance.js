import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { attendanceAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function MyAttendance() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadToday = useCallback(async () => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getToday();
      setTodayRecord(res.data.data);
    } catch (err) {
      // No record is okay
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadToday(); }, [loadToday]);

  const handleMarkIn = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await attendanceAPI.markIn({});
      setMessage({ type: 'success', text: res.data.message });
      await loadToday();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to mark IN' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkOut = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await attendanceAPI.markOut({});
      setMessage({ type: 'success', text: res.data.message });
      await loadToday();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to mark OUT' });
    } finally {
      setActionLoading(false);
    }
  };

  const canMarkIn  = !todayRecord?.in_time;
  const canMarkOut = todayRecord?.in_time && !todayRecord?.out_time;
  const isComplete = todayRecord?.in_time && todayRecord?.out_time;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-subtitle">Mark your daily attendance</p>
        </div>
      </div>

      {/* Live Clock Card */}
      <div style={styles.clockCard}>
        <div style={styles.clockDate}>
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </div>
        <div style={styles.clockTime}>
          {format(currentTime, 'HH:mm:ss')}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: 20 }}>
          {message.type === 'success' ? '✅' : '⚠'} {message.text}
        </div>
      )}

      <div className="grid-2">
        {/* Status Card */}
        <div className="card">
          <h3 style={styles.sectionTitle}>Today's Status</h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <div style={styles.statusGrid}>
              <StatusItem
                label="Shift"
                value={todayRecord?.shift_name || user?.shiftName || '—'}
                icon="🗓"
              />
              <StatusItem
                label="Status"
                value={
                  <span className={`badge badge-${todayRecord?.status === 'present' ? 'success' : todayRecord?.status ? 'danger' : 'secondary'}`}>
                    {todayRecord?.status || 'Not Marked'}
                  </span>
                }
                icon="📋"
              />
              <StatusItem
                label="IN Time"
                value={todayRecord?.in_time
                  ? <span style={{ fontFamily: 'var(--font-mono)' }}>{format(new Date(todayRecord.in_time), 'HH:mm:ss')}</span>
                  : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                icon="🟢"
              />
              <StatusItem
                label="OUT Time"
                value={todayRecord?.out_time
                  ? <span style={{ fontFamily: 'var(--font-mono)' }}>{format(new Date(todayRecord.out_time), 'HH:mm:ss')}</span>
                  : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                icon="🔴"
              />
              <StatusItem
                label="Late"
                value={todayRecord?.is_late
                  ? <span className="badge badge-warning">⏰ +{todayRecord.late_minutes} min</span>
                  : todayRecord?.in_time
                    ? <span className="badge badge-success">On Time</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                icon="⏰"
              />
              <StatusItem
                label="Early Exit"
                value={todayRecord?.is_early_leave
                  ? <span className="badge badge-info">-{todayRecord.early_leave_minutes} min</span>
                  : todayRecord?.out_time
                    ? <span className="badge badge-success">Full Day</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                icon="🏃"
              />
            </div>
          )}
        </div>

        {/* Action Card */}
        <div className="card">
          <h3 style={styles.sectionTitle}>Punch Attendance</h3>

          {isComplete ? (
            <div style={styles.completeBox}>
              <div style={{ fontSize: 48 }}>✅</div>
              <h3 style={{ color: 'var(--success)', marginBottom: 8 }}>Attendance Complete</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                You've successfully marked both IN and OUT for today.
              </p>
              {todayRecord?.is_late && (
                <div className="alert alert-warning" style={{ marginTop: 12, fontSize: 13 }}>
                  ⏰ You arrived {todayRecord.late_minutes} minutes late today.
                </div>
              )}
              {todayRecord?.is_early_leave && (
                <div className="alert" style={{ marginTop: 8, fontSize: 13, background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  🏃 You left {todayRecord.early_leave_minutes} minutes early today.
                </div>
              )}
            </div>
          ) : (
            <div style={styles.punchArea}>
              <div style={styles.punchDesc}>
                {canMarkIn && (
                  <>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                      You haven't marked IN yet. Click the button below to record your arrival time.
                    </p>
                    <button
                      className="btn btn-success"
                      onClick={handleMarkIn}
                      disabled={actionLoading}
                      style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '16px' }}
                    >
                      {actionLoading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : '🟢'}
                      Mark IN
                    </button>
                  </>
                )}
                {canMarkOut && (
                  <>
                    <div className="alert alert-success" style={{ marginBottom: 16, fontSize: 13 }}>
                      ✅ Marked IN at {format(new Date(todayRecord.in_time), 'HH:mm:ss')}
                      {todayRecord.is_late && ` (+${todayRecord.late_minutes} min late)`}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                      Ready to leave? Click below to record your departure time.
                    </p>
                    <button
                      className="btn btn-danger"
                      onClick={handleMarkOut}
                      disabled={actionLoading}
                      style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '16px' }}
                    >
                      {actionLoading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : '🔴'}
                      Mark OUT
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, value, icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const styles = {
  clockCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))',
  },
  clockDate: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    fontWeight: 500,
  },
  clockTime: {
    fontSize: '48px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '0.04em',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '16px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '12px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  punchArea: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  punchDesc: {
    flex: 1,
  },
  completeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    textAlign: 'center',
    padding: '24px 0',
  },
};
