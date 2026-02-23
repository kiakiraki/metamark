import type { Template } from '@/types/template';
import { createStandardFields } from './shared/baseFields';

export const classicTemplate: Template = {
  id: 'classic',
  name: 'Classic',
  description: 'Traditional film-inspired layout with detailed information',
  style: {
    fontFamily: 'Georgia, serif',
    fontSize: 16,
    textColor: '#2d3748',
    backgroundColor: '#f7fafc',
    opacity: 0.9,
    padding: 16,
    borderRadius: 8,
  },
  position: {
    x: 30,
    y: 30,
    width: 350,
    height: 150,
    alignment: 'left',
  },
  fields: createStandardFields(),
};
