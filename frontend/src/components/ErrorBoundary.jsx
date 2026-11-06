import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    window.__hidePreloader?.();
  }

  handleReset = async () => {
    try {
      // Clear all registers service workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let reg of regs) {
          await reg.unregister();
        }
      }
      
      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // IndexedDB stays: it holds rides saved offline that have not synced yet.
      window.location.reload();
    } catch (err) {
      console.error("Failed to clear app data:", err);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          backgroundColor: '#0f1117',
          color: '#f1f5f9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{ marginBottom: '10px', fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginBottom: '30px', color: '#94a3b8', maxWidth: '400px' }}>
            Reloading usually fixes this. Rides saved offline are kept.
          </p>
          <button 
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              backgroundColor: '#10b981',
              color: '#052e23',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
