import exifr from 'exifr';
import type { ExifData, NormalizedExifData } from '@/types/exif';
import { formatSonyModel } from './cameraNameFormatter';

export function calculateShutterSpeed(
  exposureTime?: number
): string | undefined {
  if (!exposureTime) return undefined;

  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  }

  const denominator = Math.round(1 / exposureTime);
  const relativeError = Math.abs(1 / denominator - exposureTime) / exposureTime;
  if (denominator >= 1 && relativeError <= 0.05) {
    return `1/${denominator}s`;
  }

  // Fall back to decimal notation; avoid rounding to "1.0" or "0.0"
  let decimal = exposureTime.toFixed(1);
  if (decimal === '1.0' || decimal === '0.0') {
    decimal = exposureTime.toFixed(2);
  }
  return `${decimal}s`;
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

function formatLocation(iptc?: {
  sublocation?: string;
  city?: string;
  provinceState?: string;
  country?: string;
}): string | null {
  if (!iptc) return null;
  const parts = [iptc.sublocation, iptc.city, iptc.provinceState, iptc.country]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  return parts.join(', ');
}

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

export function formatDateTime(dateTime?: string | Date): string | null {
  if (!dateTime) return null;

  try {
    // Date instance path — exifr revives some fields as Date objects
    if (dateTime instanceof Date) {
      if (isNaN(dateTime.getTime())) return null;
      return dateTime.toLocaleDateString('ja-JP', DATE_FORMAT_OPTIONS);
    }

    // String path
    const date = new Date(dateTime);
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
        return parsedDate.toLocaleDateString('ja-JP', DATE_FORMAT_OPTIONS);
      }
      return dateTime;
    }

    return date.toLocaleDateString('ja-JP', DATE_FORMAT_OPTIONS);
  } catch {
    return typeof dateTime === 'string' ? dateTime : null;
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
        dateTime: rawExif.DateTimeOriginal || rawExif.ModifyDate,
        gps:
          rawExif.latitude && rawExif.longitude
            ? {
                latitude: rawExif.latitude,
                longitude: rawExif.longitude,
              }
            : undefined,
      },
      iptc: {
        sublocation:
          rawExif['Sub-location'] ?? rawExif.SubLocation ?? rawExif.Sublocation,
        city: rawExif.City,
        provinceState:
          rawExif['Province-State'] ?? rawExif.ProvinceState ?? rawExif.State,
        country:
          rawExif['Country-PrimaryLocationName'] ??
          rawExif.Country ??
          rawExif.CountryPrimaryLocationName,
      },
    };
  } catch (error: unknown) {
    console.error('Error extracting EXIF data:', error);
    return {};
  }
}

export function normalizeExifData(exifData: ExifData): NormalizedExifData {
  const rawMake = exifData.camera?.make;
  const friendlyModel = formatSonyModel(rawMake, exifData.camera?.model);

  return {
    camera: formatCamera({
      make: rawMake,
      model: friendlyModel ?? undefined,
    }),
    cameraMake: formatStringField(rawMake),
    cameraModel: formatStringField(friendlyModel ?? undefined),
    lens: formatLens(exifData.lens),
    focalLength: formatFocalLength(exifData.lens?.focalLength),
    iso: formatISO(exifData.settings?.iso),
    aperture: formatAperture(exifData.settings?.fNumber),
    shutterSpeed: formatShutterSpeed(
      exifData.settings?.shutterSpeed,
      exifData.settings?.exposureTime
    ),
    dateTime: formatDateTime(exifData.metadata?.dateTime),
    location: formatLocation(exifData.iptc),
  };
}
