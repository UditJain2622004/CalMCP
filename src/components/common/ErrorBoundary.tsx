import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1d1c22' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#74737c', marginBottom: '24px', maxWidth: '380px' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{
                background: '#32a66a',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '15px',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
