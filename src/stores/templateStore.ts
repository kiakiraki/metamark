import { create } from 'zustand';
import type { Template, TemplatePreset } from '@/types/template';
import { templates, captionTemplate } from '@/templates';

interface TemplateState {
  selectedTemplate: Template | null;
  templates: Partial<Record<TemplatePreset, Template>>;
  selectTemplate: (preset: TemplatePreset) => void;
  updateTemplate: (template: Partial<Template>) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  selectedTemplate: captionTemplate, // Default to caption template
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
