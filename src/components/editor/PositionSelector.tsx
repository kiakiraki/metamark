import clsx from 'clsx';
import { useSettingsStore } from '@/stores/settingsStore';
import type { PositionPreset } from '@/types/template';

const CORNERS: { key: PositionPreset; label: string; pos: string }[] = [
  { key: 'top-left', label: 'Top Left', pos: 'left-1.5 top-1.5' },
  { key: 'top-right', label: 'Top Right', pos: 'right-1.5 top-1.5' },
  { key: 'bottom-left', label: 'Bottom Left', pos: 'bottom-1.5 left-1.5' },
  { key: 'bottom-right', label: 'Bottom Right', pos: 'bottom-1.5 right-1.5' },
];

export function PositionSelector() {
  const currentPosition = useSettingsStore(
    (state) => state.canvasSettings.overlayPosition
  );
  const updateCanvasSettings = useSettingsStore(
    (state) => state.updateCanvasSettings
  );

  const handlePositionChange = (position: PositionPreset) => {
    updateCanvasSettings({ overlayPosition: position });
  };

  const activeLabel = CORNERS.find((c) => c.key === currentPosition)?.label;

  return (
    <div className="space-y-3">
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        Overlay Position
      </h3>

      {/* A single photo frame; click a corner chip to place the overlay. */}
      <div className="relative mx-auto aspect-[3/2] w-full max-w-[220px] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#3a4150] to-[#23252c]">
        {/* framing guides */}
        <div className="pointer-events-none absolute inset-3 rounded border border-dashed border-white/10" />

        {CORNERS.map((corner) => {
          const isSelected = currentPosition === corner.key;
          return (
            <button
              key={corner.key}
              onClick={() => handlePositionChange(corner.key)}
              aria-label={corner.label}
              aria-pressed={isSelected}
              className={clsx(
                'absolute h-7 w-12 rounded transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-accent/70',
                corner.pos,
                isSelected
                  ? 'bg-accent shadow-lg shadow-accent/30'
                  : 'bg-white/10 hover:bg-white/25 active:scale-95'
              )}
            >
              <span className="sr-only">{corner.label}</span>
              <span
                className={clsx(
                  'block h-full w-full rounded',
                  isSelected ? 'opacity-0' : 'opacity-100'
                )}
              >
                <span className="mx-auto mt-2 block h-[3px] w-6 rounded-full bg-white/40" />
                <span className="mx-auto mt-1 block h-[2px] w-4 rounded-full bg-white/25" />
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        {activeLabel}
      </p>
    </div>
  );
}
