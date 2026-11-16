import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>!</div>
            
            <h1 style={{
              color: 'var(--text-primary)',
              fontSize: '24px',
              marginBottom: '8px',
              fontWeight: '600'
            }}>
              Oops! Something went wrong
            </h1>
            
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '24px'
            }}>
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details style={{
                marginTop: '24px',
                textAlign: 'left',
                background: 'var(--bg-tertiary)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <summary style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '12px'
                }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{
                  color: 'var(--error-color)',
                  fontSize: '14px',
                  overflow: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.href = '/'}
              style={{
                marginTop: '24px',
                padding: '12px 24px',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--primary-hover)'}
              onMouseOut={(e) => e.target.style.background = 'var(--primary-color)'}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
