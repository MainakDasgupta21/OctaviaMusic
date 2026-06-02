import React from 'react';
import { RotateCw, Home, AlertOctagon } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof window !== 'undefined' && window.console) {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, info);
      } catch {
        /* swallow */
      }
    }
  }

  handleReset = () => this.setState({ error: null });

  handleHome = () => {
    this.setState({ error: null });
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.handleReset });
    }

    return (
      <div role="alert" className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-10 max-w-lg w-full text-center">
          {/* Broken vinyl wedge */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle at 50% 50%, hsl(222 47% 15%) 0%, hsl(222 47% 4%) 100%)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 14px rgba(0,0,0,0.6)',
                clipPath: 'polygon(0 0, 50% 0, 100% 50%, 100% 100%, 0 100%)',
                transform: 'rotate(-12deg)',
              }}
            />
            <div className="absolute inset-[36%] rounded-full bg-danger/80 flex items-center justify-center text-white shadow-elev-3">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </div>

          <p className="text-xs uppercase tracking-wider text-danger font-semibold mb-2">Error</p>
          <h2 className="font-display text-3xl text-ink leading-tight mb-3">
            That track skipped.
          </h2>
          <p className="text-sm text-ink-3 mb-6">
            {error?.message || 'Something unexpected happened while rendering this view.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full gradient-accent text-track-fg text-sm font-semibold shadow-accent focus-ring"
            >
              <RotateCw className="w-4 h-4" />
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-ink text-sm font-medium hover:bg-white/10 transition-colors focus-ring"
            >
              <Home className="w-4 h-4" />
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
