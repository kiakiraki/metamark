import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
// Self-hosted fonts (see src/styles/fonts.ts for the matching font-family
// constants). The film template only draws latin digits/punctuation, so
// DotGothic16 ships the latin subset alone.
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import '@fontsource-variable/besley/index.css';
import '@fontsource/dotgothic16/latin-400.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
