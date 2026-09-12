import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeStyle } from '@/components/theme-runtime';
import { fetchCopy, fetchTheme } from '@/lib/server-catalog';
import { mergeCopy } from '@/lib/copy';
import { ChatWidget } from '@/components/chatbot/chat-widget';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'latin-ext'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin', 'latin-ext'] });

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = mergeCopy((await fetchCopy()) as never);
  return { title: meta.title, description: meta.description };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await fetchTheme();
  return (
    <html lang="pl">
      <head><ThemeStyle theme={theme} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
