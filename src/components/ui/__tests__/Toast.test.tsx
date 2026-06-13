import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from '../Toast';
import { useToastStore } from '@/hooks/useToast';

function resetStore() {
  useToastStore.setState({ toasts: [] });
}

describe('ToastContainer', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetStore();
  });

  it('renders a toast message inside a region with role="status"', () => {
    useToastStore.setState({
      toasts: [{ id: 'test-1', message: 'Hello world', type: 'info' }],
    });
    render(<ToastContainer />);

    const region = screen.getByRole('status');
    expect(region).toBeDefined();
    expect(region.textContent).toContain('Hello world');
  });

  it('close button has an accessible name and clicking it removes the toast', () => {
    useToastStore.setState({
      toasts: [{ id: 'test-2', message: 'Dismiss me', type: 'success' }],
    });
    render(<ToastContainer />);

    const closeBtn = screen.getByRole('button', {
      name: /close notification/i,
    });
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('error-type toast gets the red styling class', () => {
    useToastStore.setState({
      toasts: [
        { id: 'test-3', message: 'Something went wrong', type: 'error' },
      ],
    });
    render(<ToastContainer />);

    const msgEl = screen.getByText('Something went wrong');
    const toastDiv = msgEl.closest('div');
    expect(toastDiv?.className).toContain('bg-red-600');
  });
});
