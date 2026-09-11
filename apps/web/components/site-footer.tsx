export function SiteFooter() {
  return (
    <footer className="bg-white px-4 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-6 border-t border-line pt-8 sm:flex-row sm:items-center">
        <img src="/brand/rexor-logo.png" alt="Rexor" className="h-auto w-[112px]" />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted"><a href="/serwis">Serwis</a><a href="/konfigurator">Konfigurator</a><span>Ceny brutto</span></div>
      </div>
    </footer>
  );
}
