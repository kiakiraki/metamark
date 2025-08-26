import type { Template, TemplatePreset } from '@/types/template';
import { minimalTemplate } from './minimal';
import { classicTemplate } from './classic';
import { modernTemplate } from './modern';

export const templates: Record<TemplatePreset, Template> = {
  minimal: minimalTemplate,
  classic: classicTemplate,
  modern: modernTemplate,
  film: minimalTemplate, // Placeholder - will implement later
  technical: modernTemplate, // Placeholder - will implement later
};

export { minimalTemplate, classicTemplate, modernTemplate };