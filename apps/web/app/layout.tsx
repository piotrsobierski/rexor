import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeStyle } from '@/components/theme-runtime';
import { fetchBranding, fetchCopy, fetchTheme } from '@/lib/server-catalog';
import { mergeCopy } from '@/lib/copy';
import { publicMediaUrl } from '@/lib/catalog-merge';
import { ChatWidget } from '@/components/chatbot/chat-widget';
import { FaviconRuntime } from '@/components/favicon-runtime';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'latin-ext'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin', 'latin-ext'] });

// Ikona z panelu (site_settings.branding) ma pierwszeństwo; bez niej zostają
// statyczne pliki wygenerowane z logo przez apps/web/scripts/build-favicon.py.
const defaultIcons: Metadata['icons'] = {
  icon: [
    { url: '/favicon.ico', sizes: 'any' },
    { url: '/icon.png', type: 'image/png', sizes: '512x512' },
  ],
  apple: '/apple-icon.png',
};

export async function generateMetadata(): Promise<Metadata> {
  const [copy, branding] = await Promise.all([fetchCopy(), fetchBranding()]);
  const { meta } = mergeCopy(copy as never);
  const favicon = publicMediaUrl(branding?.faviconPath);
  return {
    title: meta.title,
    description: meta.description,
    icons: favicon ? { icon: favicon, apple: favicon } : defaultIcons,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, branding] = await Promise.all([fetchTheme(), fetchBranding()]);
  return (
    <html lang="pl">
      <head><ThemeStyle theme={theme} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <FaviconRuntime applied={branding !== null} />
        <ChatWidget />
      </body>
    </html>
  );
}
