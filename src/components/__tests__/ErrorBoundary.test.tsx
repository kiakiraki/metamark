import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import { useImageStore } from '@/stores/imageStore';

// The fallback UI intentionally logs via console.error (React also logs the
// thrown error itself) — silence both so the test output stays readable.
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <div>safe content</div>;
}

// Simulates a component whose crash is caused by the current image state
// (e.g. a corrupt/unsupported image) — it stops throwing once the image
// store is cleared, so it can prove "Try again" actually recovers.
function BombUntilImageCleared() {
  if (useImageStore((state) => state.currentImage) !== null) {
    throw new Error('boom: broken image');
  }
  return <div>safe content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear();
    useImageStore.setState({ currentImage: null });
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('shows the fallback UI and focuses the heading when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    const heading = screen.getByRole('heading', {
      name: 'Something went wrong',
    });
    expect(heading).toBeTruthy();
    expect(document.activeElement).toBe(heading);
  });

  it('clears the image store and recovers on "Try again" when that was the cause', () => {
    useImageStore.setState({
      currentImage: {
        id: 'img-1',
        url: 'blob:x',
        name: 'a.jpg',
        size: 10,
        type: 'image/jpeg',
        width: 10,
        height: 10,
        isProcessing: false,
      },
    });

    render(
      <ErrorBoundary>
        <BombUntilImageCleared />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(useImageStore.getState().currentImage).toBeNull();
    expect(screen.getByText('safe content')).toBeTruthy();
  });

  it('offers Reload page (and hides Try again) after a second consecutive failure', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    // The underlying cause is unrelated to the image store, so "Try again"
    // immediately re-throws — this is the "second failure in a row" case.
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy();
  });
});
