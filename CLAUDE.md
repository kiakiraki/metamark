# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MetaMark is a client-side web app that adds EXIF metadata overlays to photos. All image processing happens in the browser (privacy-first). Deployed as a static site on Cloudflare Workers at metamark.kiakiraki.dev.

## Commands

```bash
npm run dev              # Vite dev server at http://localhost:3000
npm run build            # Vite production build to dist/ (postbuild verifies the CSP)
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

Tests use Vitest with `jsdom` and globals enabled (configured in the `test` section of `vite.config.ts`); `@testing-library/react` is available. Tests live alongside the code they cover under `__tests__/` folders, currently in `src/services/`, `src/stores/`, `src/hooks/`, and `src/templates/`.

CI runs: lint → format:check → tsc --noEmit → test → build.

## Architecture

**Stack**: Vite / React 19 / TypeScript / Tailwind CSS v4 / Zustand / Cloudflare Workers

### Key Layers

- **Entry** — `index.html` (pins the theme to dark via `<html class="dark">`) → `src/main.tsx` (createRoot + global CSS + @fontsource imports) → `src/App.tsx` (the single page).
- **`src/components/`** — UI split into `workspace/` (image preview, drag-and-drop canvas), `editor/` (`TemplateSelector`, `PositionSelector`, `LensOverrideField`, `LocationOverrideField`), `export/` (format/quality/download controls), `ui/` (toast container). Top-level `ErrorBoundary.tsx` wraps the workspace.
- **`src/services/`** — Pure business logic, no React dependencies:
  - `exifExtractor.ts` — Reads EXIF via exifr and normalizes to display strings (ja-JP locale for dates). Routes Sony bodies through `cameraNameFormatter`.
  - `cameraNameFormatter.ts` — Rewrites Sony ILCE/ILCA/DSC model codes into the marketing α-series names (e.g. `ILCE-7M4` → `α7 IV`).
  - `canvasRenderer.ts` — Canvas drawing with dynamic height calculation, text wrapping, responsive font scaling, 4K support. Dispatches per-template rendering via the template's `customDraw` (`caption`, `technical`, `compact`, `imprint`, `gallery-placard`); the film template auto-rotates for portrait images.
  - `imageProcessor.ts` — File validation (JPEG/PNG and natively supported HEIC, max 20MB), Blob URL lifecycle.
- **`src/stores/`** — Zustand stores. Mostly independent; the one cross-store call is `imageStore` clearing `exifStore` when the image is replaced or removed (prevents stale EXIF leaking across images).
  - `imageStore` / `templateStore` — selected image and template preset.
  - `exifStore` — raw + normalized EXIF, plus per-image `lensOverrides` / `locationOverrides` exposed via `getEffectiveNormalizedData`.
  - `settingsStore` — `persist`-backed canvas settings plus template tweaks (`captionInvert`, `galleryPlacardInvert`, `imprintColor`).
- **`src/hooks/`** — Custom React hooks bridging stores/services to components: `useCanvasRenderer`, `useImageUpload`, `useResponsiveCanvas`, `useEffectiveTemplate` and `useEffectiveExifData` (apply settings/overrides on top of the selected template/EXIF), `useToast`, `useImageExport` (encapsulates the canvas-render → blob → download flow; wired into `ExportControls`), `usePanZoom` (wheel zoom anchored at cursor, drag pan when zoomed, double-click / Reset button to reset, auto-reset on image change — wired into `ImageWorkspace`). Note: `workspace/PreviewContextMenu` remains an uncommitted work-in-progress file that nothing imports yet.
- **`src/templates/`** — Template definitions exported through `index.ts` as a `Partial<Record<TemplatePreset, Template>>`: `caption`, `compact`, `technical`, `film`, `imprint`, `gallery-placard`. Each exports a `Template` object with style/position/render config; shared field definitions live in `src/templates/shared/baseFields.ts`.
- **`src/types/`** — Shared TypeScript types for exif, image, template, and canvas.
- **`src/styles/fonts.ts`** — Font-family constants (plain strings in a `{ style: { fontFamily } }` shape consumed by templates). Font files are self-hosted via `@fontsource` packages whose CSS is imported in `src/main.tsx` — no build-time network fetches (`docs/font-build-failure.md` describes the next/font/google failures this replaced). The constant strings must match the `@font-face` family names declared by the @fontsource CSS.
- **Deployment** — Static-assets-only Cloudflare Worker (no `main` script). Response headers (security + caching, including the full CSP) live in `public/_headers` and are served from `dist/_headers`. The CSP is static because Vite's output has no inline scripts; `scripts/verify-csp.mjs` (the `postbuild` hook) fails the build if one ever appears. SPA fallback is handled by `not_found_handling` in `wrangler.toml`.

### Import Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Build Output

`vite build` produces a fully static SPA in `dist/`. No server-side rendering or API routes.

## Code Style

- Prettier: single quotes, trailing commas (es5), semicolons, 2-space indent, LF line endings.
- ESLint: @eslint/js + typescript-eslint + react-hooks + react-refresh + eslint-config-prettier.
- Class name composition uses `clsx`.
- Animations use `framer-motion`.
