import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';

export interface ContextMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

interface PreviewContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

const MENU_MARGIN = 4;

export function PreviewContextMenu({
  open,
  position,
  items,
  onClose,
}: PreviewContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  // One ref slot per item, indexed in the same order as items[].
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Remembers the element that had focus before the menu opened, so we can
  // restore it on close.
  const prevFocusRef = useRef<Element | null>(null);

  // M-14: hold clamped coordinates in state so useLayoutEffect wins and the
  // JSX style prop never reverts the clamp on re-render.
  const [coords, setCoords] = useState(position);
  // Suppresses the menu until the clamp pass has run for the current
  // open/position pair, preventing a one-frame flash at the unclamped position.
  const [ready, setReady] = useState(false);

  // "Adjust state in render" pattern (same approach as usePanZoom's resetKey
  // handling): reset the ready flag synchronously when open transitions to
  // false so the next open cycle starts invisible.  This avoids calling
  // setState inside an effect body.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setReady(false);
    }
  }

  // Focus snapshot + restore (DOM side-effects, not setState → safe in effect).
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement;
    } else {
      if (prevFocusRef.current instanceof HTMLElement) {
        prevFocusRef.current.focus();
      }
      prevFocusRef.current = null;
    }
  }, [open]);

  // M-14: measure and clamp after each open/position change.
  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - MENU_MARGIN;
    const maxTop = window.innerHeight - rect.height - MENU_MARGIN;
    const left = Math.min(Math.max(MENU_MARGIN, position.x), maxLeft);
    const top = Math.min(Math.max(MENU_MARGIN, position.y), maxTop);
    setCoords({ x: left, y: top });
    setReady(true);
  }, [open, position]);

  // M-13: focus the first non-disabled item once the clamp pass is done.
  useEffect(() => {
    if (!open || !ready) return;
    const firstEnabled = itemRefs.current.find((ref) => ref && !ref.disabled);
    // preventScroll: the menu is position:fixed and already clamped into the
    // viewport; letting focus() scroll would trip the capture-phase scroll
    // listener above, which closes the menu.
    firstEnabled?.focus({ preventScroll: true });
  }, [open, ready]);

  // M-14: outside-close via pointerdown (covers touch) + contextmenu;
  // scroll and resize also close.
  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      // Swallow the click that follows this dismissal pointerdown, so closing
      // the menu does not also activate whatever sits underneath (the
      // dropzone's click-to-browse would pop the file dialog). The capture
      // listener on window runs before React's root listeners, so
      // stopPropagation prevents the synthetic click entirely.
      const squelch = (ce: MouseEvent) => {
        ce.preventDefault();
        ce.stopPropagation();
      };
      window.addEventListener('click', squelch, { capture: true, once: true });
      // If the press never produces a click (e.g. the pointer was dragged
      // away), drop the squelch after release. When a click does fire, it is
      // dispatched before this timeout callback runs, so it is still caught.
      window.addEventListener(
        'pointerup',
        () => {
          setTimeout(
            () =>
              window.removeEventListener('click', squelch, { capture: true }),
            0
          );
        },
        { once: true }
      );
      onClose();
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      // Skip the very event that opened this menu. React 19 flushes passive
      // effects in a microtask, and microtask checkpoints run between
      // listener invocations of the same dispatch — so this listener attaches
      // BEFORE the opening right-click finishes bubbling to window, and would
      // otherwise close the menu in the same dispatch that opened it.
      // The opener is identifiable: it must call preventDefault() to suppress
      // the native context menu; an unrelated right-click elsewhere is not
      // defaultPrevented and still closes us.
      if (e.defaultPrevented) return;
      onClose();
    };
    const handleScroll = () => onClose();

    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('contextmenu', handleContextMenu);
    // Scroll events are delivered asynchronously, during the rendering
    // steps — a scroll that happened just BEFORE the menu opened (trackpad
    // momentum, or a programmatic scroll-into-view) is dispatched in the
    // frame after we mount and would close the menu immediately. The spec
    // runs "scroll steps" before rAF callbacks in the same rendering update,
    // so attaching from inside requestAnimationFrame deterministically lets
    // any such stale scroll event pass unobserved.
    const rafId = requestAnimationFrame(() => {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open, onClose]);

  // M-13: full keyboard navigation on the menu container.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const enabledItems = itemRefs.current.filter(
        (ref): ref is HTMLButtonElement => ref !== null && !ref.disabled
      );
      const focusedIndex = enabledItems.findIndex(
        (el) => el === document.activeElement
      );

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          enabledItems[(focusedIndex + 1) % enabledItems.length]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          enabledItems[
            (focusedIndex - 1 + enabledItems.length) % enabledItems.length
          ]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          enabledItems[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          enabledItems[enabledItems.length - 1]?.focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onClose();
          break;
        }
        case 'Tab': {
          // Close the menu on Tab — simplest spec-consistent behavior.
          e.preventDefault();
          onClose();
          break;
        }
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <motion.div
      ref={menuRef}
      role="menu"
      aria-label="Preview actions"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 min-w-[180px] py-1 rounded-md shadow-lg border bg-white text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
      style={{
        left: coords.x,
        top: coords.y,
        visibility: ready ? 'visible' : 'hidden',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          role="menuitem"
          disabled={item.disabled}
          aria-disabled={item.disabled}
          onClick={() => {
            if (item.disabled) return;
            item.onSelect();
            onClose();
          }}
          className={
            'w-full text-left px-3 py-1.5 text-sm transition-colors ' +
            (item.disabled
              ? 'text-gray-400 cursor-not-allowed dark:text-gray-500'
              : item.variant === 'danger'
                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700')
          }
        >
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}
