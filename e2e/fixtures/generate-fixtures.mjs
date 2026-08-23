#!/usr/bin/env node
/**
 * One-time generator for e2e/fixtures/sample-sony.jpg.
 *
 * Produces a small (well under 50KB) JPEG with realistic Sony EXIF metadata
 * so Playwright E2E tests can exercise EXIF parsing / overlay rendering
 * without shipping a large real-world photo into the repo.
 *
 * This script depends on two throwaway packages that are NOT part of the
 * app's regular dependencies: `jimp` (to synthesize a base JPEG) and
 * `piexifjs` (to write EXIF into it). Install them locally with:
 *
 *   npm install --no-save piexifjs jimp
 *   node e2e/fixtures/generate-fixtures.mjs
 *
 * --no-save keeps package.json/package-lock.json untouched. Do not add
 * these packages to devDependencies.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Jimp } from 'jimp';
import piexif from 'piexifjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, 'sample-sony.jpg');

const WIDTH = 200;
const HEIGHT = 150;

async function main() {
  // 1. Synthesize a tiny base JPEG (simple vertical gradient so it's not a
  //    flat single-color image, keeping things visually inspectable).
  const image = new Jimp({ width: WIDTH, height: HEIGHT, color: 0x2b3a55ff });
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / HEIGHT;
    const r = Math.round(30 + t * 60);
    const g = Math.round(60 + t * 90);
    const b = Math.round(110 + t * 100);
    const color = (r << 24) | (g << 16) | (b << 8) | 0xff;
    for (let x = 0; x < WIDTH; x++) {
      image.setPixelColor(color >>> 0, x, y);
    }
  }
  const baseBuffer = await image.getBuffer('image/jpeg', { quality: 80 });
  const baseJpegDataUrl =
    'data:image/jpeg;base64,' + baseBuffer.toString('base64');

  // 2. Build EXIF metadata matching what src/services/exifExtractor.ts and
  //    cameraNameFormatter.ts expect from a Sony body (ILCE-7M4 -> "α7 IV").
  const zeroth = {
    [piexif.ImageIFD.Make]: 'SONY',
    [piexif.ImageIFD.Model]: 'ILCE-7M4',
    [piexif.ImageIFD.Software]: 'metamark-e2e-fixture',
  };

  const exif = {
    [piexif.ExifIFD.LensModel]: 'FE 24-70mm F2.8 GM',
    [piexif.ExifIFD.FNumber]: [28, 10], // f/2.8
    [piexif.ExifIFD.ExposureTime]: [1, 200], // 1/200s
    [piexif.ExifIFD.ISOSpeedRatings]: 200,
    [piexif.ExifIFD.DateTimeOriginal]: '2024:05:01 12:00:00',
    [piexif.ExifIFD.FocalLength]: [50, 1], // 50mm
  };

  const exifObj = { '0th': zeroth, Exif: exif, GPS: {} };
  const exifBytes = piexif.dump(exifObj);
  const withExifDataUrl = piexif.insert(exifBytes, baseJpegDataUrl);

  const base64 = withExifDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  const finalBuffer = Buffer.from(base64, 'base64');
  writeFileSync(OUT_PATH, finalBuffer);

  console.log(
    `Wrote ${OUT_PATH} (${(finalBuffer.length / 1024).toFixed(1)} KB)`
  );

  // 3. Verify EXIF round-trips by reading it back with piexifjs itself.
  const verifyDataUrl =
    'data:image/jpeg;base64,' + readFileSync(OUT_PATH).toString('base64');
  const readBack = piexif.load(verifyDataUrl);
  const make = readBack['0th'][piexif.ImageIFD.Make];
  const model = readBack['0th'][piexif.ImageIFD.Model];
  const lensModel = readBack['Exif'][piexif.ExifIFD.LensModel];
  console.log('Verification (piexifjs readback):');
  console.log('  Make:', make);
  console.log('  Model:', model);
  console.log('  LensModel:', lensModel);

  if (make !== 'SONY' || model !== 'ILCE-7M4') {
    throw new Error('EXIF verification failed: Make/Model mismatch');
  }
  if (lensModel !== 'FE 24-70mm F2.8 GM') {
    throw new Error('EXIF verification failed: LensModel mismatch');
  }
  console.log('EXIF verification OK.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
