export interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
}

export interface ProcessedImage extends ImageFile {
  processedUrl?: string;
  isProcessing: boolean;
}