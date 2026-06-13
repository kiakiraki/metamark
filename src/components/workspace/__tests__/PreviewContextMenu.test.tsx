import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  PreviewContextMenu,
  type ContextMenuItem,
} from '../PreviewContextMenu';

// Minimal item set used across tests. Item 0 is disabled so focus-skip tests
// can verify the hook jumps to item 1.
function makeItems(
  overrides: Partial<ContextMenuItem>[] = []
): ContextMenuItem[] {
  const defaults: ContextMenuItem[] = [
    { key: 'copy', label: 'Copy image', onSelect: vi.fn(), disabled: true },
    { key: 'download', label: 'Download image', onSelect: vi.fn() },
    { key: 'reset', label: 'Reset zoom', onSelect: vi.fn() },
    {
      key: 'remove',
      label: 'Remove image',
      onSelect: vi.fn(),
      variant: 'danger',
    },
  ];
  return defaults.map((item, i) =>
    i < overrides.length ? { ...item, ...overrides[i] } : item
  );
}

const POSITION = { x: 100, y: 200 };

describe('PreviewContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Basic rendering ──────────────────────────────────────────────────

  it('open renders role="menu" with aria-label and all items as role="menuitem"', () => {
    const items = makeItems();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={items}
        onClose={vi.fn()}
      />
    );

    const menu = screen.getByRole('menu', { name: 'Preview actions' });
    expect(menu).toBeDefined();

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(items.length);
    expect(menuItems[0].textContent).toContain('Copy image');
    expect(menuItems[3].textContent).toContain('Remove image');
  });

  it('renders nothing when open is false', () => {
    render(
      <PreviewContextMenu
        open={false}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('menu')).toBeNull();
  });

  // ── 2. Focus management on open ─────────────────────────────────────────

  it('focuses the first non-disabled item on open, skipping disabled item[0]', async () => {
    // items[0] is disabled; first enabled is items[1] = "Download image"
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );

    // flush layout effects + state updates from setReady(true) + focus effect
    await act(async () => {});

    const downloadBtn = screen.getByRole('menuitem', {
      name: 'Download image',
    });
    expect(document.activeElement).toBe(downloadBtn);
  });

  // ── 3. Arrow-key navigation ─────────────────────────────────────────────

  it('ArrowDown moves focus to the next non-disabled item', async () => {
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );
    await act(async () => {});

    // Focus is on items[1] (Download). Arrow down → items[2] (Reset zoom)
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Reset zoom' })
    );
  });

  it('ArrowDown wraps from last to first non-disabled item', async () => {
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );
    await act(async () => {});

    const menu = screen.getByRole('menu');
    // Advance to last enabled item (Reset zoom → Remove image) then wrap
    fireEvent.keyDown(menu, { key: 'ArrowDown' }); // → Reset zoom
    fireEvent.keyDown(menu, { key: 'ArrowDown' }); // → Remove image
    fireEvent.keyDown(menu, { key: 'ArrowDown' }); // wraps → Download image
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Download image' })
    );
  });

  it('ArrowUp moves focus to the previous non-disabled item and wraps', async () => {
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );
    await act(async () => {});

    const menu = screen.getByRole('menu');
    // Focus starts at Download (index 0 of enabled); ArrowUp wraps to last
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Remove image' })
    );
  });

  it('Home jumps to first non-disabled item', async () => {
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );
    await act(async () => {});

    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' }); // move away
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Download image' })
    );
  });

  it('End jumps to last non-disabled item', async () => {
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );
    await act(async () => {});

    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Remove image' })
    );
  });

  // ── 4. Dismiss keys ─────────────────────────────────────────────────────

  it('Escape calls onClose', async () => {
    const onClose = vi.fn();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={onClose}
      />
    );
    await act(async () => {});

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Tab calls onClose', async () => {
    const onClose = vi.fn();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={onClose}
      />
    );
    await act(async () => {});

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── 5. Outside / inside pointer-down ───────────────────────────────────

  it('pointerdown outside the menu calls onClose', () => {
    const onClose = vi.fn();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={onClose}
      />
    );

    // Fire on document.body — outside the menu
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pointerdown inside the menu does not call onClose', () => {
    const onClose = vi.fn();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={onClose}
      />
    );

    fireEvent.pointerDown(screen.getByRole('menu'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on the defaultPrevented contextmenu event that opened it', () => {
    const onClose = vi.fn();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={onClose}
      />
    );

    // The opener calls preventDefault() to suppress the native menu; because
    // React flushes passive effects in a microtask, the window listener is
    // attached before that same event finishes bubbling to window.
    const opener = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    opener.preventDefault();
    fireEvent(document.body, opener);
    expect(onClose).not.toHaveBeenCalled();

    // An unrelated (non-prevented) right-click elsewhere still closes.
    fireEvent(
      document.body,
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on scroll only after the rAF-deferred listener attaches (stale scrolls pass)', async () => {
    const onClose = vi.fn();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={onClose}
      />
    );

    // Scroll events are delivered in the rendering steps, so one queued just
    // before the menu opened arrives before our rAF callback — it must not
    // close the menu.
    fireEvent.scroll(window);
    expect(onClose).not.toHaveBeenCalled();

    // After a frame, the listener is live and genuine scrolls close the menu.
    await act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('squelches the click following a dismissal pointerdown, but not later clicks', async () => {
    const onClose = vi.fn();
    const underlyingClick = vi.fn();
    document.body.addEventListener('click', underlyingClick);

    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={onClose}
      />
    );

    // Dismissal press outside the menu: the click that completes this press
    // must NOT reach handlers underneath (it would e.g. pop the dropzone's
    // file dialog).
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(document.body);
    fireEvent.click(document.body);
    expect(underlyingClick).not.toHaveBeenCalled();

    // After the pointerup cleanup tick, subsequent clicks behave normally.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.click(document.body);
    expect(underlyingClick).toHaveBeenCalledTimes(1);

    document.body.removeEventListener('click', underlyingClick);
  });

  // ── 6. Item click behaviour ─────────────────────────────────────────────

  it('clicking a disabled item does not call its onSelect', () => {
    const items = makeItems();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={items}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy image' }));
    expect(items[0].onSelect).not.toHaveBeenCalled();
  });

  it('clicking an enabled item calls onSelect and then onClose', () => {
    const items = makeItems();
    const onClose = vi.fn();
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={items}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Download image' }));
    expect(items[1].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── 7. Focus restore on close ───────────────────────────────────────────
  // jsdom supports HTMLElement.focus() so document.activeElement tracking
  // works for natively focusable elements. If this proves flaky in CI it can
  // be dropped; the behaviour is covered by the useEffect in the component.

  it('restores focus to the previously focused element on close', async () => {
    const Wrapper = ({ open }: { open: boolean }) => (
      <div>
        <button>Trigger</button>
        <PreviewContextMenu
          open={open}
          position={POSITION}
          items={makeItems()}
          onClose={vi.fn()}
        />
      </div>
    );

    const { rerender } = render(<Wrapper open={false} />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open the menu — focus moves to first enabled item
    await act(async () => {
      rerender(<Wrapper open={true} />);
    });
    expect(document.activeElement).not.toBe(trigger);

    // Close the menu — focus should return to trigger
    await act(async () => {
      rerender(<Wrapper open={false} />);
    });
    expect(document.activeElement).toBe(trigger);
  });

  // ── 8. Disabled items carry aria-disabled ──────────────────────────────

  it('disabled items have aria-disabled attribute', () => {
    render(
      <PreviewContextMenu
        open={true}
        position={POSITION}
        items={makeItems()}
        onClose={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole('menuitem', { name: 'Copy image' });
    expect(copyBtn.getAttribute('aria-disabled')).toBe('true');

    const downloadBtn = screen.getByRole('menuitem', {
      name: 'Download image',
    });
    expect(downloadBtn.hasAttribute('aria-disabled')).toBe(false);
  });
});
