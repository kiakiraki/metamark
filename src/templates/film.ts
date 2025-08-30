import type { Template } from '@/types/template';

// Format to classic film date imprint like "'98.12.05"
function formatFilmDate(value: string | null): string {
  if (!value) return `'--.--.--`;

  // Match common patterns: YYYY/MM/DD, YYYY-MM-DD, YYYY:MM:DD, etc.
  const m = value.match(/(\d{4})[\/\-:.](\d{2})[\/\-:.](\d{2})/);
  if (m) {
    const [, yyyy, mm, dd] = m;
    const yy = yyyy.slice(-2);
    return `'${yy}.${mm}.${dd}`;
  }

  // Fallback: try Date parsing
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `'${yy}.${mm}.${dd}`;
  }

  // As a last resort, return original
  return value;
}

export const filmTemplate: Template = {
  id: 'film',
  name: 'Film',
  description: 'Retro film-camera date imprint style',
  style: {
    // Dot-matrix feel for film date imprint
    fontFamily: "'DotGothic16', 'Courier New', monospace",
    fontSize: 30,
    // Amber/orange LED-like color
    textColor: '#ff6a00',
    // Transparent background to mimic direct imprint on photo
    backgroundColor: '#000000',
    opacity: 0,
    padding: 10,
    borderRadius: 0,
  },
  position: {
    x: 20,
    y: 20,
    width: 300,
    height: 40,
    alignment: 'left',
  },
  fields: [
    {
      key: 'dateTime',
      label: '',
      visible: true,
      format: (value) => formatFilmDate(value),
    },
    // Keep other fields but hidden for this style
    { key: 'camera', label: 'Camera', visible: false },
    { key: 'lens', label: 'Lens', visible: false },
    { key: 'focalLength', label: 'Focal Length', visible: false },
    { key: 'aperture', label: 'Aperture', visible: false },
    { key: 'shutterSpeed', label: 'Shutter', visible: false },
    { key: 'iso', label: 'ISO', visible: false },
  ],
};
