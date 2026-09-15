'use client';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/** Nagłówek + stopka wokół treści strony publicznej. Jeden układ dla wszystkich podstron. */
export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1">{children}</main><SiteFooter /></div>;
}
