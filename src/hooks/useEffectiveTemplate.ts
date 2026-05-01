import { useMemo } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Template } from '@/types/template';

export function useEffectiveTemplate(): Template | null {
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const captionInvert = useSettingsStore((state) => state.captionInvert);

  return useMemo(() => {
    if (!selectedTemplate) return null;
    if (selectedTemplate.customDraw !== 'caption' || !captionInvert) {
      return selectedTemplate;
    }
    return {
      ...selectedTemplate,
      style: {
        ...selectedTemplate.style,
        backgroundColor: '#ffffff',
        textColor: '#000000',
      },
    };
  }, [selectedTemplate, captionInvert]);
}
