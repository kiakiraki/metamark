import type { Template } from '@/types/template';

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
      label: 'Shutter Speed',
      visible: true,
    },
    {
      key: 'iso',
      label: 'ISO',
      visible: true,
    },
    {
      key: 'dateTime',
      label: 'Date & Time',
      visible: true,
    },
  ],
};