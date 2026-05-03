import type { Template, TemplatePreset } from '@/types/template';
import { filmTemplate } from './film';
import { technicalTemplate } from './technical';
import { compactTemplate } from './compact';
import { captionTemplate } from './caption';
import { imprintTemplate } from './imprint';

// Only include available templates. Missing presets are treated as not available.
export const templates: Partial<Record<TemplatePreset, Template>> = {
  film: filmTemplate,
  technical: technicalTemplate,
  compact: compactTemplate,
  caption: captionTemplate,
  imprint: imprintTemplate,
};

export {
  filmTemplate,
  technicalTemplate,
  compactTemplate,
  captionTemplate,
  imprintTemplate,
};
