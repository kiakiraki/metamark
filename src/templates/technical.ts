import type { Template } from '@/types/template';
import { createStandardFields } from './shared/baseFields';

export const technicalTemplate: Template = {
  id: 'technical',
  name: 'Technical',
  description: 'Detailed specs with monospaced layout',
  style: {
    fontFamily: 'Menlo, Consolas, ui-monospace, monospace',
    fontSize: 13,
    textColor: '#111827',
    backgroundColor: '#F3F4F6',
    opacity: 0.95,
    padding: 14,
    borderRadius: 6,
  },
  position: {
    x: 24,
    y: 24,
    width: 360,
    height: 180,
    alignment: 'left',
  },
  fields: createStandardFields({
    focalLength: 'Focal',
    shutterSpeed: 'Shutter',
    dateTime: 'Captured',
  }),
};
