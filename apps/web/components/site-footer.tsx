'use client';

import { OptimizedImage } from '@/components/optimized-image';
import { usePublicCopy } from '@/lib/use-public-copy';

export function SiteFooter() {
  const copy = usePublicCopy();
  return (
    <footer className="bg-white px-4 pt-10 pb-28 sm:px-8 sm:pb-24 lg:px-12">
      <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:pr-20">
        <OptimizedImage src="/brand/rexor-logo.png" alt="Rexor" className="h-auto w-[112px]" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted"><a href="/serwis" data-testid="footer-link-serwis">{copy.footer.serwis}</a><a href="/realizacje" data-testid="footer-link-realizacje">{copy.footer.realizacje}</a><a href="/konfigurator" data-testid="footer-link-konfigurator">{copy.footer.konfigurator}</a><a href="/regulamin" data-testid="footer-link-regulamin">{copy.footer.regulamin}</a><a href="/polityka-prywatnosci" data-testid="footer-link-polityka">{copy.footer.polityka}</a><a href="/kontakt" data-testid="footer-link-kontakt">{copy.footer.kontakt}</a><span>{copy.footer.vatNote}</span></div>
      </div>
    </footer>
  );
}
