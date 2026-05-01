import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    marginLeft: 'var(--sidebar-width)',
    flex: 1,
    background: 'var(--bg-primary)',
    minHeight: '100vh',
  },
  content: {
    padding: '28px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
};
