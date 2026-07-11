import { useSelectedImage } from '@/stores/imageStore';
import { useSettingsStore } from '@/stores/settingsStore';
import clsx from 'clsx';
import { useEffectiveTemplate } from '@/hooks/useEffectiveTemplate';
import { useEffectiveExifData } from '@/hooks/useEffectiveExifData';
import { useImageExport } from '@/hooks/useImageExport';
import { DownloadIcon } from '@/components/ui/icons';

export function ExportControls() {
  const { exportImage, isExporting, canExport } = useImageExport();

  const selectedImage = useSelectedImage();
  const exifData = useEffectiveExifData(selectedImage?.id);
  const selectedTemplate = useEffectiveTemplate();
  const canvasSettings = useSettingsStore((state) => state.canvasSettings);
  const updateCanvasSettings = useSettingsStore(
    (state) => state.updateCanvasSettings
  );

  const statusMessage = !selectedImage
    ? 'Select an image to export'
    : !selectedTemplate
      ? 'Choose a template'
      : !exifData
        ? 'Reading image metadata…'
        : null;

  return (
    <div className="space-y-5">
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        Export
      </h3>

      {/* Format Settings */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Format
        </h4>
        <div className="inline-flex rounded-lg border border-white/10 bg-surface-2 p-0.5">
          {(['png', 'jpeg'] as const).map((format) => (
            <button
              key={format}
              onClick={() => updateCanvasSettings({ format })}
              aria-pressed={canvasSettings.format === format}
              className={clsx(
                'rounded-md px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider transition-colors',
                canvasSettings.format === format
                  ? 'bg-accent text-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {/* Quality Settings */}
      {canvasSettings.format === 'jpeg' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Quality
            </h4>
            <span className="font-mono text-xs text-accent">
              {Math.round(canvasSettings.quality * 100)}%
            </span>
          </div>
          <label htmlFor="quality-slider" className="sr-only">
            JPEG Quality
          </label>
          <input
            id="quality-slider"
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={canvasSettings.quality}
            onChange={(e) =>
              updateCanvasSettings({ quality: parseFloat(e.target.value) })
            }
            className="w-full accent-accent"
          />
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={() => exportImage()}
        disabled={!canExport || isExporting}
        aria-busy={isExporting}
        title={
          !selectedImage
            ? 'Select an image first'
            : !selectedTemplate
              ? 'Choose a template first'
              : !exifData
                ? 'Reading image metadata...'
                : isExporting
                  ? 'Exporting...'
                  : 'Download image with overlay'
        }
        className={clsx(
          'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all',
          canExport && !isExporting
            ? 'bg-accent text-black hover:brightness-110 active:scale-[0.99]'
            : 'cursor-not-allowed bg-white/5 text-zinc-600'
        )}
      >
        {isExporting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
            Exporting…
          </>
        ) : (
          <>
            <DownloadIcon size={18} />
            Download Image
          </>
        )}
      </button>

      {/* Status */}
      <div className="font-mono text-[11px] uppercase tracking-wider">
        {statusMessage && <p className="text-zinc-500">{statusMessage}</p>}
        {canExport && (
          <p className="flex items-center gap-1.5 text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Ready to export
          </p>
        )}
      </div>
    </div>
  );
}
