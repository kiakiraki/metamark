import type { Template } from '@/types/template';
import { createStandardFields } from './shared/baseFields';
import { besley } from '@/styles/fonts';

export const captionTemplate: Template = {
  id: 'caption',
  name: 'Caption',
  description: 'Bottom padded black bar with white EXIF text',
  layout: 'bottom-padding',
  style: {
    fontFamily: besley.style.fontFamily,
    fontSize: 16,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    opacity: 1,
    padding: 18,
    borderRadius: 0,
  },
  position: {
    x: 0,
    y: 0,
    width: 1000,
    height: 180,
    alignment: 'left',
  },
  fontRequirements: [
    { family: besley.style.fontFamily },
    { family: besley.style.fontFamily, weights: [600] },
  ],
  customDraw: 'caption',
  fields: createStandardFields(),
};
