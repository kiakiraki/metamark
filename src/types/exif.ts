export interface ExifData {
  camera?: {
    make?: string | undefined;
    model?: string | undefined;
  };
  lens?: {
    make?: string | undefined;
    model?: string | undefined;
    focalLength?: number | undefined;
  };
  settings?: {
    iso?: number | undefined;
    fNumber?: number | undefined;
    shutterSpeed?: string | undefined;
    exposureTime?: number | undefined;
  };
  metadata?: {
    dateTime?: string | Date | undefined;
    gps?:
      | {
          latitude?: number;
          longitude?: number;
        }
      | undefined;
  };
  iptc?: {
    sublocation?: string | undefined;
    city?: string | undefined;
    provinceState?: string | undefined;
    country?: string | undefined;
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
  location: string | null;
}
