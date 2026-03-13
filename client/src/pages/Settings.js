import React from 'react';
import AuthenticatedPageLayout from '../components/AuthenticatedPageLayout';
import { useAuthStore } from '../context/store';

const Settings = () => {
  const { user } = useAuthStore();

  return (
    <AuthenticatedPageLayout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Manage your account preferences.
        </p>

        <div
          style={{
            background: 'rgba(17,24,39,0.78)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Account
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Name</span>
              <p style={{ margin: 0, fontWeight: 500 }}>{user?.name || '—'}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email</span>
              <p style={{ margin: 0, fontWeight: 500 }}>{user?.email || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedPageLayout>
  );
};

export default Settings;
