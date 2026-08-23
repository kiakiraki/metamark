import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
// Self-hosted fonts (see src/styles/fonts.ts for the matching font-family
// constants). This app only ever renders latin + latin-ext text (plus
// Japanese for location overrides like 東京・浅草), so we hand-pick the
// subsets we need in self-hosted-fonts.css instead of importing each
// @fontsource package's index.css, which bundles every script subset
// (cyrillic, vietnamese, ...) the app never uses, and — for DotGothic16 —
// a legacy woff fallback alongside the woff2 every supported browser
// actually takes. DotGothic16's japanese face is a single ~400KB woff2,
// only downloaded once Japanese text actually appears.
import './styles/self-hosted-fonts.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
