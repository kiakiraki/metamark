import type { Template } from '@/types/template';
import { createStandardFields } from './shared/baseFields';

export const minimalTemplate: Template = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean and simple design with essential camera information',
  style: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: 14,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    opacity: 0.8,
    padding: 12,
    borderRadius: 4,
  },
  position: {
    x: 20,
    y: 20,
    width: 300,
    height: 180,
    alignment: 'left',
  },
  fields: createStandardFields({
    focalLength: 'Focal Length',
    shutterSpeed: 'Shutter',
    dateTime: 'Date',
  }),
};
