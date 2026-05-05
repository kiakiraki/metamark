# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MetaMark is a client-side web app that adds EXIF metadata overlays to photos. All image processing happens in the browser (privacy-first). Deployed as a static site on Cloudflare Workers at metamark.kiakiraki.dev.

## Commands

```bash
npm run dev              # Dev server (Turbopack) at http://localhost:3000
npm run build            # Static export to dist/
npm run preview          # Serve dist/ locally on port 3000
npm run lint             # ESLint
npm run format           # Prettier (write)
npm run format:check     # Prettier (check only, used in CI)
npx tsc --noEmit         # Type check
npm test                 # Vitest (single run)
npm run test:watch       # Vitest (watch mode)
npm run deploy           # Deploy to Cloudflare Workers (production)
npm run deploy:preview   # Deploy to Cloudflare Workers (preview)
```

Run a single test file: `npx vitest run src/services/__tests__/canvasRenderer.test.ts`
Run a single test by name: `npx vitest run -t "scales down landscape"`

Tests use Vitest with `jsdom` and globals enabled (see `vitest.config.ts`); `@testing-library/react` is available. Tests live alongside the code they cover under `__tests__/` folders, currently in `src/services/`, `src/stores/`, `src/hooks/`, and `src/templates/`.

CI runs: lint → format:check → tsc --noEmit → test → build.

## Architecture

**Stack**: Next.js (App Router, static export) / React 19 / TypeScript / Tailwind CSS v4 / Zustand / Cloudflare Workers

### Key Layers

- **`src/app/`** — Single-page app (`page.tsx` is the only route). Layout pins the theme to dark (`<html className="dark">`) and wires the font CSS variables from `@/styles/fonts`.
- **`src/components/`** — UI split into `workspace/` (image preview, drag-and-drop canvas, right-click `PreviewContextMenu`), `editor/` (`TemplateSelector`, `PositionSelector`, `LensOverrideField`, `LocationOverrideField`), `export/` (format/quality/download controls), `ui/` (toast container). Top-level `ErrorBoundary.tsx` wraps the workspace.
- **`src/services/`** — Pure business logic, no React dependencies:
  - `exifExtractor.ts` — Reads EXIF via exifr and normalizes to display strings (ja-JP locale for dates). Routes Sony bodies through `cameraNameFormatter`.
  - `cameraNameFormatter.ts` — Rewrites Sony ILCE/ILCA/DSC model codes into the marketing α-series names (e.g. `ILCE-7M4` → `α7 IV`).
  - `canvasRenderer.ts` — Canvas drawing with dynamic height calculation, text wrapping, responsive font scaling, 4K support. Dispatches per-template rendering via the template's `customDraw` (`caption`, `technical`, `compact`, `imprint`, `gallery-placard`); the film template auto-rotates for portrait images.
  - `imageProcessor.ts` — File validation (JPEG/PNG/HEIC, max 20MB), Blob URL lifecycle.
- **`src/stores/`** — Zustand stores. No cross-store dependencies.
  - `imageStore` / `templateStore` — selected image and template preset.
  - `exifStore` — raw + normalized EXIF, plus per-image `lensOverrides` / `locationOverrides` exposed via `getEffectiveNormalizedData`.
  - `settingsStore` — `persist`-backed canvas settings plus template tweaks (`captionInvert`, `galleryPlacardInvert`, `imprintColor`).
- **`src/hooks/`** — Custom React hooks bridging stores/services to components: `useCanvasRenderer`, `useImageUpload`, `useImageExport`, `useResponsiveCanvas`, `usePanZoom` (pinch/scroll zoom + drag with viewport clamping), `useEffectiveTemplate` and `useEffectiveExifData` (apply settings/overrides on top of the selected template/EXIF), `useToast`.
- **`src/templates/`** — Template definitions exported through `index.ts` as a `Partial<Record<TemplatePreset, Template>>`: `caption`, `compact`, `technical`, `film`, `imprint`, `gallery-placard`. Each exports a `Template` object with style/position/render config; shared field definitions live in `src/templates/shared/baseFields.ts`.
- **`src/types/`** — Shared TypeScript types for exif, image, template, and canvas.
- **`src/styles/fonts.ts`** — Centralized font loaders consumed by the layout: Geist Sans/Mono and Besley via `next/font/google`, DotGothic16 self-hosted via `next/font/local` from `src/styles/fonts/DotGothic16-Latin.woff2` (see `docs/font-build-failure.md` — Google Fonts' DotGothic16 fans out into ~120 subset fetches and a single transient failure breaks the build).
- **`src/worker.ts`** — Cloudflare Worker entry point. Serves static assets from dist/, injects security headers (CSP, HSTS, COOP/COEP), handles SPA fallback to /index.html, and sets cache policies.

### Import Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Build Output

`output: 'export'` in next.config.ts produces fully static HTML in `dist/`. No server-side rendering or API routes.

## Code Style

- Prettier: single quotes, trailing commas (es5), semicolons, 2-space indent, LF line endings.
- ESLint: next/core-web-vitals + next/typescript + eslint-config-prettier.
- UI components use Radix UI primitives (Dialog, Select, Slider) for accessibility.
- Class name composition uses `clsx`.
