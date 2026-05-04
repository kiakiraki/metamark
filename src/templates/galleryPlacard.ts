import type { Template } from '@/types/template';
import { createStandardFields } from './shared/baseFields';
import { geistSans, besley } from '@/styles/fonts';

export const galleryPlacardTemplate: Template = {
  id: 'gallery-placard',
  name: 'Gallery Placard',
  description: 'Museum-style bottom placard with refined camera metadata',
  layout: 'bottom-padding',
  style: {
    fontFamily: geistSans.style.fontFamily,
    fontSize: 16,
    textColor: '#2a2621',
    backgroundColor: '#f4efe6',
    opacity: 1,
    padding: 44,
    borderRadius: 0,
  },
  position: {
    x: 0,
    y: 0,
    width: 1000,
    height: 240,
    alignment: 'left',
  },
  fontRequirements: [
    { family: geistSans.style.fontFamily },
    { family: geistSans.style.fontFamily, weights: [600] },
    { family: besley.style.fontFamily },
    { family: besley.style.fontFamily, weights: [600] },
  ],
  customDraw: 'gallery-placard',
  fields: createStandardFields(),
};
