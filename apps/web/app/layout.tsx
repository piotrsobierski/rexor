import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeRuntime } from '@/components/theme-runtime';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'latin-ext'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'Konfigurator rowerów | Rexor Bikes',
  description: 'Zbuduj własny rower Rexor i zapisz konfigurację do późniejszego powrotu.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}><ThemeRuntime />{children}</body>
    </html>
  );
}
