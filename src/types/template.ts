export interface TemplateStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  opacity: number;
  padding: number;
  borderRadius: number;
}

export interface TemplatePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  alignment: 'left' | 'center' | 'right';
}

export type PositionPreset =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface Template {
  id: string;
  name: string;
  description: string;
  style: TemplateStyle;
  position: TemplatePosition;
  fields: TemplateField[];
}

export interface TemplateField {
  key: keyof import('./exif').NormalizedExifData;
  label: string;
  visible: boolean;
  format?: (value: string | null) => string;
}

export type TemplatePreset =
  | 'minimal'
  | 'classic'
  | 'modern'
  | 'film'
  | 'technical';
