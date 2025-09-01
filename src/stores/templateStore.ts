import { create } from 'zustand';
import type { Template, TemplatePreset } from '@/types/template';
import { templates, minimalTemplate } from '@/templates';

interface TemplateState {
  selectedTemplate: Template | null;
  templates: Partial<Record<TemplatePreset, Template>>;
  selectTemplate: (preset: TemplatePreset) => void;
  updateTemplate: (template: Partial<Template>) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  selectedTemplate: minimalTemplate, // Default to minimal template
  templates,

  selectTemplate: (preset) =>
    set((state) => {
      const next = state.templates[preset];
      return {
        selectedTemplate: next ?? state.selectedTemplate,
      };
    }),

  updateTemplate: (templateUpdate) =>
    set((state) => ({
      selectedTemplate: state.selectedTemplate
        ? { ...state.selectedTemplate, ...templateUpdate }
        : null,
    })),
}));

// Set default template
useTemplateStore.getState().selectTemplate('minimal');
