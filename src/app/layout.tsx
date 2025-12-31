import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { geistSans, geistMono, dotGothic, besley } from '@/styles/fonts';

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
        className={`${geistSans.variable} ${geistMono.variable} ${dotGothic.variable} ${besley.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
