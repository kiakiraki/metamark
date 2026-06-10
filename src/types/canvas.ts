import type { PositionPreset } from './template';

export interface CanvasSettings {
  width: number;
  height: number;
  quality: number;
  format: 'png' | 'jpeg';
  scale: number;
  overlayPosition: PositionPreset;
}

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  template: import('./template').Template;
  exifData: import('./exif').NormalizedExifData;
  settings: CanvasSettings;
  // Defaults to window.devicePixelRatio. Pass 1 for exports so the output
  // resolution does not depend on the display the app happens to run on.
  devicePixelRatio?: number;
}
