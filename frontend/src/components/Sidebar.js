import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ADMIN = [
  { to: '/dashboard',    icon: '⊞', label: 'Dashboard' },
  { to: '/employees',    icon: '👥', label: 'Employees' },
  { to: '/attendance',   icon: '✓',  label: 'Attendance' },
  { to: '/reports',      icon: '📊', label: 'Reports' },
  { to: '/shift-config', icon: '⚙',  label: 'Shift Config' },
];

const NAV_EMPLOYEE = [
  { to: '/my-attendance', icon: '✓', label: 'My Attendance' },
  { to: '/my-report',     icon: '📊', label: 'My Report' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? NAV_ADMIN : NAV_EMPLOYEE;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>⏱</div>
        <div>
          <div style={styles.brandName}>ShiftWatch</div>
          <div style={styles.brandSub}>Attendance System</div>
        </div>
      </div>

      {/* User info */}
      <div style={styles.userCard}>
        <div style={styles.userAvatar}>
          {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{user?.fullName || user?.username}</div>
          <span className={`badge ${isAdmin ? 'badge-info' : 'badge-success'}`}>
            {isAdmin ? 'Admin' : 'Employee'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navSection}>MENU</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {}),
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={styles.footer}>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <span>⇥</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minHeight: '100vh',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    overflowY: 'auto',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid var(--border)',
  },
  brandIcon: {
    fontSize: '28px',
    lineHeight: 1,
  },
  brandName: {
    fontFamily: 'var(--font-mono)',
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  brandSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    margin: '12px',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 700,
    color: 'white',
    flexShrink: 0,
  },
  userInfo: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nav: {
    flex: 1,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navSection: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--text-muted)',
    padding: '12px 8px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: 'var(--accent-glow)',
    color: 'var(--accent-light)',
    borderLeft: '3px solid var(--accent)',
  },
  navIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  footer: {
    padding: '16px 12px',
    borderTop: '1px solid var(--border)',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};
