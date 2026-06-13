import clsx from 'clsx';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { templates } from '@/templates';
import type { TemplatePreset } from '@/types/template';
import { dotGothic } from '@/styles/fonts';
import { PositionSelector } from './PositionSelector';

/* --- Miniature template previews ----------------------------------------- */
/* Each thumbnail mocks the template's overlay on a tiny CSS "photo" so the
 * choice reads at a glance instead of through a text description. */

function MockPhoto({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'relative w-full overflow-hidden bg-gradient-to-b from-[#48505f] via-[#363b47] to-[#23252c]',
        className
      )}
    >
      {/* moon */}
      <div className="absolute right-[20%] top-[14%] h-1.5 w-1.5 rounded-full bg-zinc-200/70" />
      {/* ridgeline */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-[#16171b] [clip-path:polygon(0%_100%,0%_52%,30%_18%,48%_60%,68%_32%,100%_70%,100%_100%)]" />
    </div>
  );
}

function MockBar({ className }: { className?: string }) {
  return <div className={clsx('h-[3px] rounded-full', className)} />;
}

function TemplateThumb({ preset }: { preset: TemplatePreset }) {
  switch (preset) {
    case 'caption':
      return (
        <div className="flex h-full flex-col">
          <MockPhoto className="flex-1" />
          <div className="flex h-[30%] flex-col justify-center gap-1 bg-black px-2">
            <MockBar className="w-3/5 bg-zinc-200/80" />
            <MockBar className="h-[2px] w-2/5 bg-zinc-500" />
          </div>
        </div>
      );
    case 'compact':
      return (
        <div className="relative h-full">
          <MockPhoto className="h-full" />
          <div className="absolute bottom-1.5 left-1.5 grid grid-cols-2 gap-x-1.5 gap-y-1 rounded-[3px] bg-white/15 p-1.5 backdrop-blur-[2px]">
            <MockBar className="h-[2px] w-4 bg-zinc-100/80" />
            <MockBar className="h-[2px] w-3 bg-zinc-100/60" />
            <MockBar className="h-[2px] w-3 bg-zinc-100/60" />
            <MockBar className="h-[2px] w-4 bg-zinc-100/80" />
          </div>
        </div>
      );
    case 'technical':
      return (
        <div className="relative h-full">
          <MockPhoto className="h-full" />
          <div className="absolute inset-x-1.5 bottom-1.5 space-y-1 rounded-[3px] bg-white/15 p-1.5 backdrop-blur-[2px]">
            <MockBar className="h-[2px] w-3/4 bg-zinc-100/80" />
            <MockBar className="h-[2px] w-1/2 bg-zinc-100/60" />
          </div>
        </div>
      );
    case 'imprint':
      return (
        <div className="relative h-full">
          <MockPhoto className="h-full" />
          <div className="absolute bottom-2 left-2 space-y-1">
            <MockBar className="w-10 bg-white/90" />
            <MockBar className="h-[2px] w-6 bg-white/60" />
          </div>
        </div>
      );
    case 'gallery-placard':
      return (
        <div className="flex h-full flex-col">
          <MockPhoto className="flex-1" />
          <div className="flex h-[34%] flex-col items-center justify-center gap-1 bg-[#f0e9d8]">
            <MockBar className="w-2/5 bg-zinc-800/80" />
            <MockBar className="h-[2px] w-1/4 bg-zinc-500/70" />
          </div>
        </div>
      );
    case 'film':
      // Frameless orange date imprint burned into the bottom-right corner,
      // mimicking a film camera's quartz-date back (see filmTemplate).
      return (
        <div className="relative h-full">
          <MockPhoto className="h-full" />
          <span
            className="absolute bottom-1.5 right-1.5 text-[9px] leading-none tracking-tight text-[#ff6a00] [text-shadow:0_0_3px_rgba(255,106,0,0.7)]"
            style={{ fontFamily: dotGothic.style.fontFamily }}
          >
            '98.12.05
          </span>
        </div>
      );
  }
}

/* --- Per-template option toggle ------------------------------------------ */

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium text-zinc-200">{title}</h4>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={clsx(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-2 focus:ring-offset-surface-2',
            checked ? 'bg-accent' : 'bg-white/15'
          )}
        >
          <span
            className={clsx(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </label>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function TemplateSelector() {
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const selectTemplate = useTemplateStore((state) => state.selectTemplate);
  const captionInvert = useSettingsStore((state) => state.captionInvert);
  const setCaptionInvert = useSettingsStore((state) => state.setCaptionInvert);
  const galleryPlacardInvert = useSettingsStore(
    (state) => state.galleryPlacardInvert
  );
  const setGalleryPlacardInvert = useSettingsStore(
    (state) => state.setGalleryPlacardInvert
  );
  const imprintColor = useSettingsStore((state) => state.imprintColor);
  const setImprintColor = useSettingsStore((state) => state.setImprintColor);

  const templatePresets: {
    key: TemplatePreset;
    name: string;
    description: string;
  }[] = [
    { key: 'caption', name: 'Caption', description: 'Black footer bar' },
    { key: 'compact', name: 'Compact', description: '2×2 frosted info card' },
    { key: 'technical', name: 'Glass', description: 'Frosted glass card' },
    { key: 'imprint', name: 'Imprint', description: 'Frameless text on photo' },
    {
      key: 'gallery-placard',
      name: 'Placard',
      description: 'Museum-style ivory placard below photo',
    },
    { key: 'film', name: 'Film', description: 'Vintage style' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        Template
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        {templatePresets.map((preset) => {
          const template = templates[preset.key];
          const isSelected = selectedTemplate?.id === preset.key;
          const isAvailable = template?.id === preset.key; // Check if template is fully implemented

          return (
            <button
              key={preset.key}
              onClick={() => isAvailable && selectTemplate(preset.key)}
              disabled={!isAvailable}
              title={preset.description}
              aria-pressed={isSelected}
              className={clsx(
                'group overflow-hidden rounded-lg border text-left transition-all duration-150',
                {
                  'border-accent/70 ring-1 ring-accent/40':
                    isSelected && isAvailable,
                  'border-white/10 hover:border-white/30':
                    !isSelected && isAvailable,
                  'cursor-not-allowed border-white/5 opacity-40': !isAvailable,
                }
              )}
            >
              <div className="aspect-[4/3]">
                <TemplateThumb preset={preset.key} />
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] bg-surface-2 px-2 py-1.5">
                <span
                  className={clsx(
                    'text-xs font-medium',
                    isSelected ? 'text-accent' : 'text-zinc-300'
                  )}
                >
                  {preset.name}
                  {!isAvailable && (
                    <span className="ml-1 text-[10px] text-zinc-600">
                      (soon)
                    </span>
                  )}
                </span>
                {isSelected && isAvailable && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTemplate?.customDraw === 'imprint' && (
        <SettingToggle
          title="Invert text color"
          description="Black text instead of white"
          checked={imprintColor === 'black'}
          onChange={(next) => setImprintColor(next ? 'black' : 'white')}
        />
      )}

      {selectedTemplate?.customDraw === 'caption' && (
        <SettingToggle
          title="Invert colors"
          description="White background with black text"
          checked={captionInvert}
          onChange={setCaptionInvert}
        />
      )}

      {selectedTemplate?.customDraw === 'gallery-placard' && (
        <SettingToggle
          title="Invert colors"
          description="Dark placard with ivory text"
          checked={galleryPlacardInvert}
          onChange={setGalleryPlacardInvert}
        />
      )}

      {/* Position Selector */}
      <div className="border-t border-white/[0.06] pt-5">
        <PositionSelector />
      </div>
    </div>
  );
}
