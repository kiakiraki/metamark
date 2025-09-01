import type { Template, TemplatePreset } from '@/types/template';
import { minimalTemplate } from './minimal';
import { classicTemplate } from './classic';
import { filmTemplate } from './film';
import { technicalTemplate } from './technical';

// Only include available templates. Missing presets (e.g., 'technical') are treated as not available.
export const templates: Partial<Record<TemplatePreset, Template>> = {
  minimal: minimalTemplate,
  classic: classicTemplate,
  film: filmTemplate,
  technical: technicalTemplate,
};

export { minimalTemplate, classicTemplate, filmTemplate, technicalTemplate };
