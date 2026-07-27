import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/effect throws so a single component fault shows a recoverable
 * message instead of unmounting the whole app to a blank page. "Try again"
 * clears the error and re-renders; "Reload" is the hard reset.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for anyone with the console open; the UI stays usable.
    console.error("SQLPlay caught a render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-card">
            <h1>Something went wrong.</h1>
            <p>
              The console hit an unexpected error. Your data lives in browser
              memory for this session — reloading starts a fresh database.
            </p>
            <pre className="error-boundary-msg">{this.state.error.message}</pre>
            <div className="error-boundary-actions">
              <button
                className="btn primary"
                onClick={() => this.setState({ error: null })}
              >
                Try again
              </button>
              <button className="btn" onClick={() => location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
