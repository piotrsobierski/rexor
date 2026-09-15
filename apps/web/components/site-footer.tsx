'use client';

import { usePublicCopy } from '@/lib/use-public-copy';

export function SiteFooter() {
  const copy = usePublicCopy();
  return (
    <footer className="bg-white px-4 pt-10 pb-28 sm:px-8 sm:pb-24 lg:px-12">
      <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:pr-20">
        <img src="/brand/rexor-logo.png" alt="Rexor" className="h-auto w-[112px]" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted"><a href="/serwis">{copy.footer.serwis}</a><a href="/realizacje">{copy.footer.realizacje}</a><a href="/konfigurator">{copy.footer.konfigurator}</a><a href="/regulamin">{copy.footer.regulamin}</a><a href="/polityka-prywatnosci">{copy.footer.polityka}</a><a href="/kontakt">{copy.footer.kontakt}</a><span>{copy.footer.vatNote}</span></div>
      </div>
    </footer>
  );
}
