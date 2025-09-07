import React from 'react';

export default function HomeTest() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>🚀 SonicPay Home Test</h1>
        <p>This is a test of the Home component</p>
        <p style={{ fontSize: '1rem', marginTop: '1rem' }}>
          If you see this, the routing is working!
        </p>
      </div>
    </div>
  );
}
