import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    const { error, errorInfo } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash paper">
        <div className="empty">
          <span className="label">Something broke</span>
          <h3>This page hit an error</h3>
          <p>Reload to try again. If it keeps happening, go back to the start page.</p>
          {import.meta.env.DEV && (
            <details>
              <summary className="label">Error details (shown in development only)</summary>
              <pre>
                {error.toString()}
                {errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <div className="crash-actions">
            <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a href="/" className="button">
              Start page
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
