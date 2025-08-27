import type { Template } from '@/types/template';

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
    height: 180, // Increased height to accommodate all 7 fields including date
    alignment: 'left',
  },
  fields: [
    {
      key: 'camera',
      label: 'Camera',
      visible: true,
    },
    {
      key: 'lens',
      label: 'Lens',
      visible: true,
    },
    {
      key: 'focalLength',
      label: 'Focal Length',
      visible: true,
    },
    {
      key: 'aperture',
      label: 'Aperture',
      visible: true,
    },
    {
      key: 'shutterSpeed',
      label: 'Shutter',
      visible: true,
    },
    {
      key: 'iso',
      label: 'ISO',
      visible: true,
    },
    {
      key: 'dateTime',
      label: 'Date',
      visible: true,
    },
  ],
};
