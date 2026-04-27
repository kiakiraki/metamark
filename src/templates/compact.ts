import type { Template } from '@/types/template';
import { createStandardFields } from './shared/baseFields';
import { geistSans } from '@/styles/fonts';

export const compactTemplate: Template = {
  id: 'compact',
  name: 'Compact',
  description: 'Compact 2×2 frosted info card',
  style: {
    fontFamily: geistSans.style.fontFamily,
    fontSize: 14,
    textColor: '#ffffff',
    backgroundColor: 'rgba(20, 22, 28, 0.55)',
    opacity: 1,
    padding: 18,
    borderRadius: 12,
  },
  position: {
    x: 0,
    y: 0,
    width: 600,
    height: 130,
    alignment: 'left',
  },
  fontRequirements: [
    { family: geistSans.style.fontFamily },
    { family: geistSans.style.fontFamily, weights: [500] },
  ],
  customDraw: 'compact',
  fields: createStandardFields(),
};
