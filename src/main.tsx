import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
// Self-hosted fonts (see src/styles/fonts.ts for the matching font-family
// constants). DotGothic16 ships the latin subset for ASCII and the japanese
// subset for CJK glyphs (e.g. location overrides like 東京・浅草). The
// japanese face is a single ~400KB woff2 gated by unicode-range, so it is
// only downloaded once Japanese text actually appears.
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import '@fontsource-variable/besley/index.css';
import '@fontsource/dotgothic16/latin-400.css';
import '@fontsource/dotgothic16/japanese-400.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
