import { Component, createRef, type ReactNode, type ErrorInfo } from 'react';
import { useImageStore } from '@/stores/imageStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  // Counts consecutive catches without a successful re-render in between,
  // so a second failure in a row (e.g. "Try again" immediately re-throws on
  // the same broken image) offers a harder recovery path instead of looping
  // silently on the same broken state.
  consecutiveErrors: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private headingRef = createRef<HTMLHeadingElement>();

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, consecutiveErrors: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState((prev) => ({
      consecutiveErrors: prev.consecutiveErrors + 1,
    }));
  }

  componentDidMount() {
    // A throw during the very first render is committed as part of the
    // initial mount (not an "update"), so componentDidUpdate never fires
    // for it — handle that case here.
    if (this.state.hasError) {
      this.headingRef.current?.focus();
    }
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    // Move focus to the fallback heading whenever we transition into the
    // error state, so screen-reader/keyboard users land somewhere sensible
    // instead of on a focus target that just unmounted.
    if (this.state.hasError && !prevState.hasError) {
      this.headingRef.current?.focus();
    }
  }

  handleReset = () => {
    // Clear the (possibly corrupted) image state before re-rendering the
    // subtree, so "Try again" doesn't just re-throw immediately on the same
    // broken image.
    useImageStore.getState().clearImage();
    this.setState({ hasError: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const repeatedFailure = this.state.consecutiveErrors >= 2;

      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4 p-8 text-center">
          <h2
            ref={this.headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-zinc-100 focus:outline-none"
          >
            Something went wrong
          </h2>
          <p className="text-zinc-400">
            An unexpected error occurred.
            {repeatedFailure
              ? ' It keeps happening — reloading the page is the most reliable fix.'
              : ' Please try again.'}
          </p>
          <div className="flex gap-3">
            {!repeatedFailure && (
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-accent px-4 py-2 font-medium text-black transition hover:brightness-110"
              >
                Try again
              </button>
            )}
            <button
              onClick={this.handleReload}
              className={
                repeatedFailure
                  ? 'rounded-lg bg-accent px-4 py-2 font-medium text-black transition hover:brightness-110'
                  : 'rounded-lg border border-white/15 px-4 py-2 font-medium text-zinc-200 transition hover:border-white/25'
              }
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
