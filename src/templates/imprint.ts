import type { Template } from '@/types/template';
import { createStandardFields } from './shared/baseFields';
import { geistSans } from '@/styles/fonts';

export const imprintTemplate: Template = {
  id: 'imprint',
  name: 'Imprint',
  description: 'Frameless EXIF text printed directly on the photo',
  style: {
    fontFamily: geistSans.style.fontFamily,
    fontSize: 16,
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    opacity: 0,
    padding: 12,
    borderRadius: 0,
  },
  position: {
    x: 0,
    y: 0,
    width: 720,
    height: 120,
    alignment: 'left',
  },
  fontRequirements: [
    { family: geistSans.style.fontFamily },
    { family: geistSans.style.fontFamily, weights: [600] },
  ],
  customDraw: 'imprint',
  fields: createStandardFields(),
};
