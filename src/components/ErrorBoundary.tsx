import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4 p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-100">
              Something went wrong
            </h2>
            <p className="text-zinc-400">
              An unexpected error occurred. Please reload the page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-black transition hover:brightness-110"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
