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
      
      // Clear IndexedDB completely
      window.indexedDB.deleteDatabase("cabservice-offline");
      
      // Hard refresh
      window.location.reload(true);
    } catch (err) {
      console.error("Failed to clear app data:", err);
      // Fallback reload if clearing fails
      window.location.reload(true);
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
          height: '100vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{ marginBottom: '10px', fontSize: '1.875rem', fontWeight: 'bold' }}>App Update Detected</h1>
          <p style={{ marginBottom: '30px', color: '#94a3b8', maxWidth: '400px' }}>
            We've detected an update or a temporary issue. Please clear the cache to continue using the app.
          </p>
          <button 
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            Clear App Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
