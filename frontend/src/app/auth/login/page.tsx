'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    // Redirect to FORGE login - centralized authentication
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname.includes('.local') ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname === 'localhost'
    );
    const forgeLoginUrl = isLocal
      ? 'http://acidashboard.aci.local:2005/login?redirect=nexus'
      : 'https://aci-forge.vercel.app/login?redirect=nexus';
    window.location.href = forgeLoginUrl;
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Redirecting to ACI FORGE...</div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>Please wait while we redirect you to the login page.</div>
      </div>
    </div>
  );
}
