import { create } from 'zustand';
import type { Template, TemplatePreset } from '@/types/template';
import { templates } from '@/templates';

interface TemplateState {
  selectedTemplate: Template | null;
  templates: Record<TemplatePreset, Template>;
  selectTemplate: (preset: TemplatePreset) => void;
  updateTemplate: (template: Partial<Template>) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  selectedTemplate: templates.minimal, // Default to minimal template
  templates,

  selectTemplate: (preset) =>
    set((state) => ({
      selectedTemplate: state.templates[preset],
    })),

  updateTemplate: (templateUpdate) =>
    set((state) => ({
      selectedTemplate: state.selectedTemplate
        ? { ...state.selectedTemplate, ...templateUpdate }
        : null,
    })),
}));

// Set default template
useTemplateStore.getState().selectTemplate('minimal');
