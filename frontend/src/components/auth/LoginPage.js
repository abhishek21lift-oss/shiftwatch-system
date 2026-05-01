import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(user.role === 'admin' ? '/dashboard' : '/my-attendance');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>⏱</div>
          <h1 style={styles.logoText}>ShiftWatch</h1>
          <p style={styles.tagline}>Staff Attendance Management System</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Welcome back</h2>
          <p style={styles.cardSub}>Sign in to your account</p>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="form-group">
              <label>Username or Email</label>
              <input
                className="form-control"
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
            >
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div style={styles.creds}>
            <p style={styles.credTitle}>Demo Credentials</p>
            <div style={styles.credGrid}>
              <div style={styles.credItem}>
                <span style={styles.credRole}>Admin</span>
                <code style={styles.credCode}>admin / Admin@123</code>
              </div>
              <div style={styles.credItem}>
                <span style={styles.credRole}>Employee</span>
                <code style={styles.credCode}>john.doe / Emp@12345</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
    backgroundSize: '60px 60px',
    opacity: 0.4,
    pointerEvents: 'none',
  },
  container: {
    width: '100%',
    maxWidth: '420px',
    position: 'relative',
    zIndex: 1,
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '48px',
    lineHeight: 1,
    marginBottom: '8px',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '-0.02em',
  },
  tagline: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '32px',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: 700,
    marginBottom: '4px',
  },
  cardSub: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  creds: {
    marginTop: '24px',
    padding: '16px',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  credTitle: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    marginBottom: '10px',
  },
  credGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  credItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  credRole: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    minWidth: '70px',
  },
  credCode: {
    fontSize: '12px',
    color: 'var(--accent-light)',
    background: 'var(--bg-primary)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
  },
};
