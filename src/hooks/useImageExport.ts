import { useCallback, useState } from 'react';
import { useSelectedImage } from '@/stores/imageStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { CanvasRenderer } from '@/services/canvasRenderer';
import { ImageProcessor } from '@/services/imageProcessor';
import { useToast } from '@/hooks/useToast';
import { useEffectiveTemplate } from '@/hooks/useEffectiveTemplate';
import { useEffectiveExifData } from '@/hooks/useEffectiveExifData';
import type { CanvasSettings } from '@/types/canvas';

export type ExportOverrides = Partial<
  Pick<CanvasSettings, 'format' | 'quality'>
>;

export function useImageExport() {
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const selectedImage = useSelectedImage();
  const exifData = useEffectiveExifData(selectedImage?.id);
  const selectedTemplate = useEffectiveTemplate();
  const canvasSettings = useSettingsStore((state) => state.canvasSettings);

  // exifData is undefined while extraction is still in flight; images
  // without EXIF still resolve to an all-null NormalizedExifData, so this
  // only blocks the brief extraction window after an upload.
  const canExport = !!selectedImage && !!selectedTemplate && !!exifData;

  const exportImage = useCallback(
    async (overrides: ExportOverrides = {}): Promise<boolean> => {
      if (!selectedImage || !selectedTemplate || !exifData) return false;

      setIsExporting(true);
      try {
        const image = await ImageProcessor.createImageElement(
          selectedImage.url
        );

        const canvas = document.createElement('canvas');
        const { width, height } = CanvasRenderer.calculateOptimalSize(
          selectedImage.width,
          selectedImage.height
        );

        const settings: CanvasSettings = {
          ...canvasSettings,
          ...overrides,
          width,
          height,
        };

        const blob = await CanvasRenderer.renderToBlob({
          canvas,
          image,
          template: selectedTemplate,
          exifData,
          settings,
          // Keep the exported resolution independent of the display the app
          // runs on; calculateOptimalSize already caps the output at 4K.
          devicePixelRatio: 1,
        });

        const url = URL.createObjectURL(blob);
        // Safari aborts downloads if the blob URL is revoked synchronously
        // after click(); schedule the revoke so the download has time to start.
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metamark_${selectedImage.name.replace(/\.[^/.]+$/, '')}.${settings.format}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        try {
          a.click();
        } finally {
          a.remove();
        }
        return true;
      } catch (error: unknown) {
        console.error('Export failed:', error);
        toast.error('Export failed. Please try again.');
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [selectedImage, selectedTemplate, canvasSettings, exifData, toast]
  );

  return { exportImage, isExporting, canExport };
}
