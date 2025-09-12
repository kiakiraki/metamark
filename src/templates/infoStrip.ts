import type { Template } from '@/types/template';

export const infoStripTemplate: Template = {
  id: 'infostrip',
  name: 'Info Strip',
  description: 'Black footer strip with white EXIF text',
  style: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: 16,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    opacity: 1,
    padding: 16,
    borderRadius: 0,
  },
  position: {
    x: 0,
    y: 0,
    width: 1000,
    height: 200,
    alignment: 'left',
  },
  fields: [
    { key: 'camera', label: 'Camera', visible: true },
    { key: 'lens', label: 'Lens', visible: true },
    { key: 'focalLength', label: 'Focal Length', visible: true },
    { key: 'aperture', label: 'Aperture', visible: true },
    { key: 'shutterSpeed', label: 'Shutter', visible: true },
    { key: 'iso', label: 'ISO', visible: true },
    { key: 'dateTime', label: 'Date', visible: true },
  ],
};
