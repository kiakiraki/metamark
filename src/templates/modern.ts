import type { Template } from '@/types/template';

export const modernTemplate: Template = {
  id: 'modern',
  name: 'Modern',
  description: 'Contemporary design with accent colors',
  style: {
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 15,
    textColor: '#ffffff',
    backgroundColor: '#3b82f6',
    opacity: 0.85,
    padding: 14,
    borderRadius: 12,
  },
  position: {
    x: 25,
    y: 25,
    width: 320,
    height: 130,
    alignment: 'left',
  },
  fields: [
    {
      key: 'camera',
      label: '📷',
      visible: true,
    },
    {
      key: 'lens',
      label: '🔍',
      visible: true,
    },
    {
      key: 'focalLength',
      label: 'FL',
      visible: true,
    },
    {
      key: 'aperture',
      label: 'f/',
      visible: true,
    },
    {
      key: 'shutterSpeed',
      label: 'SS',
      visible: true,
    },
    {
      key: 'iso',
      label: 'ISO',
      visible: true,
    },
    {
      key: 'dateTime',
      label: '📅',
      visible: false,
    },
  ],
};