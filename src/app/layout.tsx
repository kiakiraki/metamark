import type { Metadata } from 'next';
import './globals.css';
// Self-hosted fonts (see src/styles/fonts.ts for the matching font-family
// constants). The film template only draws latin digits/punctuation, so
// DotGothic16 ships the latin subset alone.
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import '@fontsource-variable/besley/index.css';
import '@fontsource/dotgothic16/latin-400.css';

export const metadata: Metadata = {
  title: 'MetaMark - EXIF Metadata Overlay',
  description: 'Add beautiful EXIF metadata overlays to your photos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head />
      <body className="antialiased">{children}</body>
    </html>
  );
}
