import type { Template } from '@/types/template';
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
  fields: [
    { key: 'camera', label: 'Camera', visible: true },
    { key: 'lens', label: 'Lens', visible: true },
    { key: 'focalLength', label: 'Focal Length', visible: true },
    { key: 'aperture', label: 'Aperture', visible: true },
    { key: 'shutterSpeed', label: 'Shutter Speed', visible: true },
    { key: 'iso', label: 'ISO', visible: true },
    { key: 'dateTime', label: 'Date & Time', visible: true },
  ],
};
