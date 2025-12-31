import { Geist, Geist_Mono, DotGothic16, Besley } from 'next/font/google';

export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Self-hosted font for the film template.
export const dotGothic = DotGothic16({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dotgothic',
});

export const besley = Besley({
  subsets: ['latin'],
  variable: '--font-besley',
  weight: ['400', '600'],
});
