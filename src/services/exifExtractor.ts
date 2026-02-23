import exifr from 'exifr';
import type { ExifData, NormalizedExifData } from '@/types/exif';

function calculateShutterSpeed(exposureTime?: number): string | undefined {
  if (!exposureTime) return undefined;

  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  } else {
    const denominator = Math.round(1 / exposureTime);
    return `1/${denominator}s`;
  }
}

function formatCamera(camera?: {
  make?: string;
  model?: string;
}): string | null {
  if (!camera?.make && !camera?.model) return null;

  if (camera.make && camera.model) {
    return `${camera.make} ${camera.model}`;
  }

  return camera.make || camera.model || null;
}

function formatStringField(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatLens(lens?: { make?: string; model?: string }): string | null {
  if (!lens?.make && !lens?.model) return null;

  if (lens.make && lens.model) {
    return `${lens.make} ${lens.model}`;
  }

  return lens.make || lens.model || null;
}

function formatFocalLength(focalLength?: number): string | null {
  if (!focalLength) return null;
  return `${Math.round(focalLength)}mm`;
}

function formatISO(iso?: number): string | null {
  if (!iso) return null;
  return `ISO ${iso}`;
}

function formatAperture(fNumber?: number): string | null {
  if (!fNumber) return null;
  return `f/${fNumber}`;
}

function formatShutterSpeed(
  shutterSpeed?: string,
  exposureTime?: number
): string | null {
  if (shutterSpeed) return shutterSpeed;
  if (!exposureTime) return null;
  return calculateShutterSpeed(exposureTime) || null;
}

function formatDateTime(dateTime?: string): string | null {
  if (!dateTime) return null;

  try {
    const date = new Date(dateTime);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // Try parsing EXIF date format (YYYY:MM:DD HH:mm:ss)
      const exifMatch = dateTime.match(
        /^(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/
      );
      if (exifMatch) {
        const [, year, month, day, hour, minute, second] = exifMatch;
        const parsedDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );

        return parsedDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return dateTime;
    }

    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
}

export async function extractExifData(file: File): Promise<ExifData> {
  try {
    const rawExif = await exifr.parse(file, true);

    if (!rawExif) {
      return {};
    }

    return {
      camera: {
        make: rawExif.Make,
        model: rawExif.Model,
      },
      lens: {
        make: rawExif.LensMake,
        model: rawExif.LensModel,
        focalLength: rawExif.FocalLength,
      },
      settings: {
        iso: rawExif.ISO,
        fNumber: rawExif.FNumber,
        exposureTime: rawExif.ExposureTime,
        shutterSpeed: calculateShutterSpeed(rawExif.ExposureTime),
      },
      metadata: {
        dateTime: rawExif.DateTime || rawExif.DateTimeOriginal,
        gps:
          rawExif.latitude && rawExif.longitude
            ? {
                latitude: rawExif.latitude,
                longitude: rawExif.longitude,
              }
            : undefined,
      },
    };
  } catch (error: unknown) {
    console.error('Error extracting EXIF data:', error);
    return {};
  }
}

export function normalizeExifData(exifData: ExifData): NormalizedExifData {
  return {
    camera: formatCamera(exifData.camera),
    cameraMake: formatStringField(exifData.camera?.make),
    cameraModel: formatStringField(exifData.camera?.model),
    lens: formatLens(exifData.lens),
    focalLength: formatFocalLength(exifData.lens?.focalLength),
    iso: formatISO(exifData.settings?.iso),
    aperture: formatAperture(exifData.settings?.fNumber),
    shutterSpeed: formatShutterSpeed(
      exifData.settings?.shutterSpeed,
      exifData.settings?.exposureTime
    ),
    dateTime: formatDateTime(exifData.metadata?.dateTime),
  };
}
