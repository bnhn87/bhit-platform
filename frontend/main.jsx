import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{
    backgroundColor: '#000',
    color: '#fff',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '2rem'
  }}>
    <img src="/logo.png" alt="BHIT Logo" style={{ maxWidth: '300px', marginBottom: '2rem' }} />
    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Website installation coming soon</h1>
    <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Contact: <a href="mailto:ben@bhit.uk" style={{ color: '#f97316' }}>ben@bhit.uk</a></p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
