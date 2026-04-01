import React from 'react';

function App(): React.JSX.Element {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Precious Dashboard
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
          Sovereign Risk Management
        </p>
      </div>
    </div>
  );
}

export default App;
