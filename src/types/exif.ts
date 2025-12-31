export interface ExifData {
  camera?: {
    make?: string;
    model?: string;
  };
  lens?: {
    make?: string;
    model?: string;
    focalLength?: number;
  };
  settings?: {
    iso?: number;
    fNumber?: number;
    shutterSpeed?: string;
    exposureTime?: number;
  };
  metadata?: {
    dateTime?: string;
    gps?: {
      latitude?: number;
      longitude?: number;
    };
  };
}

export interface NormalizedExifData {
  camera: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  focalLength: string | null;
  iso: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  dateTime: string | null;
}
