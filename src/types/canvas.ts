export interface CanvasSettings {
  width: number;
  height: number;
  quality: number;
  format: 'png' | 'jpeg';
  scale: number;
}

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  template: import('./template').Template;
  exifData: import('./exif').NormalizedExifData;
  settings: CanvasSettings;
}