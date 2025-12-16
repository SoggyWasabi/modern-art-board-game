import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Game component crashed:', error, errorInfo)

    // Log error details for debugging
    console.log('Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1c20 0%, #2d3436 100%)',
            color: 'white',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ marginBottom: '16px', color: '#f59e0b' }}>
            Oops! Something went wrong
          </h2>
          <p style={{ marginBottom: '24px', opacity: 0.8 }}>
            The game encountered an error. Please refresh the page to continue.
          </p>
          <details style={{ marginBottom: '24px', opacity: 0.6 }}>
            <summary>Error details</summary>
            <pre style={{
              textAlign: 'left',
              fontSize: '12px',
              marginTop: '12px',
              background: 'rgba(0,0,0,0.3)',
              padding: '12px',
              borderRadius: '8px',
              overflow: 'auto'
            }}>
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#f59e0b',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Refresh Game
          </button>
        </div>
      )
    }

    return this.props.children
  }
}