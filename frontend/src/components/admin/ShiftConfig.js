import React, { useState, useEffect } from 'react';
import { shiftsAPI } from '../../utils/api';

export default function ShiftConfig() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editShift, setEditShift] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    try {
      const res = await shiftsAPI.getAll();
      setShifts(res.data.data);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to load shifts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shift Configuration</h1>
          <p className="page-subtitle">Configure shift timings and grace periods</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      <div className="grid-2" style={{ maxWidth: 900 }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          shifts.map(shift => (
            <div key={shift.id} className="card" style={{ border: `1px solid ${shift.shift_type === 'morning' ? 'rgba(245,158,11,0.3)' : 'rgba(139,92,246,0.3)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  fontSize: 32,
                  width: 52, height: 52,
                  borderRadius: 'var(--radius-md)',
                  background: shift.shift_type === 'morning' ? 'rgba(245,158,11,0.12)' : 'rgba(139,92,246,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {shift.shift_type === 'morning' ? '☀' : '🌙'}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>{shift.name}</h2>
                  <span className={`badge ${shift.shift_type === 'morning' ? 'badge-morning' : 'badge-evening'}`}>
                    {shift.employee_count} employees
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <TimeRow label="IN Time" value={shift.in_time?.slice(0, 5)} />
                <TimeRow label="OUT Time" value={shift.out_time?.slice(0, 5)} />
                <TimeRow label="Grace Period" value={`${shift.grace_minutes} minutes`} />
                <TimeRow
                  label="Working Hours"
                  value={computeHours(shift.in_time, shift.out_time)}
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setEditShift(shift)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                ✏ Edit Shift Timings
              </button>
            </div>
          ))
        )}
      </div>

      {/* Attendance Logic Info */}
      <div className="card" style={{ marginTop: 24, maxWidth: 900 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 16 }}>
          📋 Attendance Rules
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { rule: 'Late Arrival', desc: 'Employee is marked LATE if they mark IN after (Shift IN time + Grace period minutes)' },
            { rule: 'Early Exit',   desc: 'Employee is marked EARLY LEAVE if they mark OUT before the Shift OUT time' },
            { rule: 'Double IN',    desc: 'System prevents marking IN twice without an OUT in between' },
            { rule: 'OUT before IN',desc: 'System prevents marking OUT if there is no IN record for the day' },
            { rule: 'Admin Override',desc: 'Admin can manually correct any attendance record with a mandatory reason' },
          ].map(r => (
            <div key={r.rule} style={{ display: 'flex', gap: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ minWidth: 120, fontWeight: 700, fontSize: 13, color: 'var(--accent-light)' }}>{r.rule}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editShift && (
        <ShiftEditModal
          shift={editShift}
          onClose={() => setEditShift(null)}
          onSave={() => { setEditShift(null); load(); }}
          onMessage={setMessage}
        />
      )}
    </div>
  );
}

function TimeRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function computeHours(inTime, outTime) {
  if (!inTime || !outTime) return '—';
  const [ih, im] = inTime.split(':').map(Number);
  const [oh, om] = outTime.split(':').map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
}

function ShiftEditModal({ shift, onClose, onSave, onMessage }) {
  const [form, setForm] = useState({
    name: shift.name,
    in_time: shift.in_time?.slice(0, 5) || '',
    out_time: shift.out_time?.slice(0, 5) || '',
    grace_minutes: shift.grace_minutes || 10,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await shiftsAPI.update(shift.id, form);
      onMessage({ type: 'success', text: `${form.name} updated successfully` });
      onSave();
    } catch (err) {
      onMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to update shift' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Edit: {shift.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Shift Name</label>
            <input className="form-control" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>IN Time (HH:MM) *</label>
              <input className="form-control" type="time" value={form.in_time}
                onChange={e => setForm(p => ({ ...p, in_time: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>OUT Time (HH:MM) *</label>
              <input className="form-control" type="time" value={form.out_time}
                onChange={e => setForm(p => ({ ...p, out_time: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label>Grace Period (minutes)</label>
            <input className="form-control" type="number" min="0" max="60" value={form.grace_minutes}
              onChange={e => setForm(p => ({ ...p, grace_minutes: parseInt(e.target.value) }))} />
            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Employees arriving within grace period are NOT marked late
            </small>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
