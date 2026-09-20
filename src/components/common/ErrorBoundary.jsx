import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Enterprise React Error Boundary
 * Catches JavaScript errors anywhere in child component tree, logs them,
 * and renders a luxury fallback UI instead of crashing to a blank white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearAndReload = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV !== 'production';

      return (
        <div className="min-h-screen bg-[#0F1418] flex items-center justify-center p-4 text-[#EFEFF1]">
          <div className="w-full max-w-lg rounded-2xl bg-[#14181C]/90 backdrop-blur-xl border border-[#2E363E] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Ambient emerald gradient backdrop glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Icon & Title */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Tribes &amp; Cliqs Resilience Guard
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Something went off-beat
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#949599] leading-relaxed mb-6">
              An unexpected interface error was prevented from interrupting your experience. You can try refreshing the view, returning home, or clearing session state.
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1C232B] hover:bg-[#252E38] text-white border border-[#2E363E] hover:border-emerald-500/40 text-xs font-bold transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[11px] text-[#949599]">
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="hover:text-amber-400 transition underline underline-offset-4"
              >
                Clear session &amp; restart
              </button>

              {isDev && this.state.error && (
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center gap-1 hover:text-white transition font-mono text-[10px]"
                >
                  <span>Diagnostic Trace</span>
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Dev trace panel */}
            {isDev && this.state.showDetails && this.state.error && (
              <div className="mt-4 p-3 rounded-xl bg-black/60 border border-red-500/30 text-[10px] font-mono text-red-300 max-h-48 overflow-y-auto space-y-2">
                <p className="font-bold">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[9px] text-[#949599] whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
