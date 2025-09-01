import type { Metadata } from 'next';
import { Geist, Geist_Mono, DotGothic16 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Filmテンプレート用フォントは next/font で自前配信
const dotGothic = DotGothic16({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dotgothic',
});

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
    <html lang="en">
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dotGothic.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
