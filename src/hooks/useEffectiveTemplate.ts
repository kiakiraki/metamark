import { useMemo } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Template } from '@/types/template';

export function useEffectiveTemplate(): Template | null {
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const captionInvert = useSettingsStore((state) => state.captionInvert);
  const galleryPlacardInvert = useSettingsStore(
    (state) => state.galleryPlacardInvert
  );
  const imprintColor = useSettingsStore((state) => state.imprintColor);

  return useMemo(() => {
    if (!selectedTemplate) return null;

    if (selectedTemplate.customDraw === 'caption' && captionInvert) {
      return {
        ...selectedTemplate,
        style: {
          ...selectedTemplate.style,
          backgroundColor: '#ffffff',
          textColor: '#000000',
        },
      };
    }

    if (
      selectedTemplate.customDraw === 'gallery-placard' &&
      galleryPlacardInvert
    ) {
      return {
        ...selectedTemplate,
        style: {
          ...selectedTemplate.style,
          backgroundColor: '#0d0b08',
          textColor: selectedTemplate.style.backgroundColor,
        },
      };
    }

    if (selectedTemplate.customDraw === 'imprint') {
      return {
        ...selectedTemplate,
        style: {
          ...selectedTemplate.style,
          textColor: imprintColor === 'black' ? '#000000' : '#ffffff',
        },
      };
    }

    return selectedTemplate;
  }, [selectedTemplate, captionInvert, galleryPlacardInvert, imprintColor]);
}
