export interface ImageFile {
  id: string;
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
