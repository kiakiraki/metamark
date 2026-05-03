import { Geist, Geist_Mono, Besley } from 'next/font/google';
import localFont from 'next/font/local';

export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Self-hosted: DotGothic16 via next/font/google fans out into ~120 woff2
// subset requests at build time and a single transient fetch failure breaks
// the build. Keep the file in src/ so next/font/local bundles it.
export const dotGothic = localFont({
  src: './fonts/DotGothic16-Latin.woff2',
  variable: '--font-dotgothic',
  display: 'swap',
});

export const besley = Besley({
  subsets: ['latin'],
  variable: '--font-besley',
  weight: ['400', '600'],
});
