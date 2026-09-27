'use client';

import { OptimizedImage } from '@/components/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicCopy, usePublicCopyReady } from '@/lib/use-public-copy';

export function SiteFooter() {
  const copy = usePublicCopy();
  // Jak w SiteHeader: przy eksporcie statycznym teksty nadpisane w panelu
  // dojeżdżają z /api po załadowaniu, więc do tego czasu szkielet zamiast
  // wartości z builda (copy-provider.tsx).
  const copyReady = usePublicCopyReady();
  const link = (href: string, testid: string, value: string, width: string) => (
    <a href={href} data-testid={testid}>{copyReady ? value : <Skeleton aria-hidden="true" className={`inline-block h-4 ${width}`} />}</a>
  );
  return (
    <footer className="bg-white px-4 pt-10 pb-28 sm:px-8 sm:pb-24 lg:px-12">
      <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:pr-20">
        <OptimizedImage src="/brand/rexor-logo.png" alt="Rexor" className="h-auto w-[112px]" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">{link('/serwis', 'footer-link-serwis', copy.footer.serwis, 'w-14')}{link('/realizacje', 'footer-link-realizacje', copy.footer.realizacje, 'w-20')}{link('/konfigurator', 'footer-link-konfigurator', copy.footer.konfigurator, 'w-24')}{link('/regulamin', 'footer-link-regulamin', copy.footer.regulamin, 'w-18')}{link('/polityka-prywatnosci', 'footer-link-polityka', copy.footer.polityka, 'w-28')}{link('/kontakt', 'footer-link-kontakt', copy.footer.kontakt, 'w-16')}<span>{copyReady ? copy.footer.vatNote : <Skeleton aria-hidden="true" className="inline-block h-4 w-20" />}</span></div>
      </div>
    </footer>
  );
}
