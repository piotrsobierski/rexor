import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeStyle } from '@/components/theme-runtime';
import { fetchTheme } from '@/lib/server-catalog';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'latin-ext'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'Konfigurator rowerów | Rexor Bikes',
  description: 'Zbuduj własny rower Rexor i zapisz konfigurację do późniejszego powrotu.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await fetchTheme();
  return (
    <html lang="pl">
      <head><ThemeStyle theme={theme} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
