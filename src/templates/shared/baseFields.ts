import type { TemplateField } from '@/types/template';

interface FieldLabels {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  dateTime?: string;
}

const defaults: Required<FieldLabels> = {
  camera: 'Camera',
  lens: 'Lens',
  focalLength: 'Focal Length',
  aperture: 'Aperture',
  shutterSpeed: 'Shutter Speed',
  iso: 'ISO',
  dateTime: 'Date & Time',
};

export function createStandardFields(
  overrides: FieldLabels = {}
): TemplateField[] {
  const labels = { ...defaults, ...overrides };
  return [
    { key: 'camera', label: labels.camera, visible: true },
    { key: 'lens', label: labels.lens, visible: true },
    { key: 'focalLength', label: labels.focalLength, visible: true },
    { key: 'aperture', label: labels.aperture, visible: true },
    { key: 'shutterSpeed', label: labels.shutterSpeed, visible: true },
    { key: 'iso', label: labels.iso, visible: true },
    { key: 'dateTime', label: labels.dateTime, visible: true },
  ];
}
