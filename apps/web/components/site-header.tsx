'use client';

import { Menu, Settings, SlidersHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { OptimizedImage } from '@/components/optimized-image';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicCopy, usePublicCopyReady } from '@/lib/use-public-copy';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const copy = usePublicCopy();
  // Przy eksporcie statycznym nadpisania z panelu docierają z /api dopiero po
  // załadowaniu: zamiast migać tekstami z builda ("Rowery" -> "Rowery111")
  // pokazujemy szkielet, aż teksty będą potwierdzone (copy-provider.tsx).
  const copyReady = usePublicCopyReady();
  const pathname = usePathname();
  const links = [
    { href: '/rowery', label: copy.nav.rowery },
    { href: '/ramy', label: copy.nav.ramy },
    { href: '/realizacje', label: copy.nav.realizacje },
    { href: '/serwis', label: copy.nav.serwis },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/94 backdrop-blur-xl">
      <div className="mx-auto grid h-[72px] max-w-[1480px] grid-cols-[1fr_auto] items-center px-4 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-12">
        <a href="/" className="flex w-fit items-center" aria-label={copy.nav.homeAria} data-testid="header-logo-link">
          <OptimizedImage src="/brand/rexor-logo.png" alt="Rexor" priority className="h-auto w-[132px]" />
        </a>

        <NavigationMenu className="hidden lg:flex" aria-label={copy.nav.navigationAria}>
          <NavigationMenuList className="gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink
                    render={<a href={link.href} aria-current={isActive ? 'page' : undefined} data-testid={`nav-link-${link.href.slice(1)}`} />}
                    className={cn(
                      'relative px-3 py-2 text-[0.92rem] text-ink-muted hover:bg-ink-wash hover:text-black',
                      isActive && 'text-black after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:rounded-full after:bg-ink',
                    )}
                  >
                    {copyReady ? link.label : <Skeleton aria-hidden="true" className="h-4 w-16" />}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center justify-end gap-2 sm:flex">
          <Button render={<a href="/admin" aria-label={copy.nav.adminAria} data-testid="header-admin-button" />} variant="outline" size="icon-lg" className="size-11 rounded-full border-ink hover:bg-ink hover:text-white">
            <Settings aria-hidden="true" />
          </Button>
          <Button render={<a href="/konfigurator" data-testid="header-configurator-button" />} variant="outline" size="lg" className="h-11 rounded-full border-ink px-5 font-mono text-xs font-semibold uppercase tracking-[0.12em] hover:bg-ink hover:text-white">
            {copyReady ? copy.nav.cta : <Skeleton aria-hidden="true" className="h-4 w-32" />} <SlidersHorizontal data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon-lg" className="justify-self-end rounded-full sm:hidden" aria-label={copy.nav.menuAria} data-testid="header-menu-button" />}><Menu aria-hidden="true" /></SheetTrigger>
          <SheetContent side="right" className="w-[88vw] bg-white sm:max-w-sm" data-testid="header-mobile-menu">
            <SheetHeader className="border-b border-line p-6">
              <SheetTitle><OptimizedImage src="/brand/rexor-logo.png" alt="Rexor" className="h-auto w-[120px]" /></SheetTitle>
              <SheetDescription className="sr-only">{copy.nav.navigationAria}</SheetDescription>
            </SheetHeader>
            <nav className="grid gap-1 px-4 py-3 text-lg font-semibold">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                return (
                  <SheetClose
                    key={link.href}
                    render={<a href={link.href} aria-current={isActive ? 'page' : undefined} data-testid={`mobile-nav-link-${link.href.slice(1)}`} />}
                    className={cn('rounded-xl px-3 py-3 hover:bg-ink-wash', isActive && 'bg-ink-wash text-black')}
                  >
                    {copyReady ? link.label : <Skeleton aria-hidden="true" className="h-5 w-20" />}
                  </SheetClose>
                );
              })}
            </nav>
            <div className="mt-auto p-4">
              <Button render={<a href="/konfigurator" data-testid="header-mobile-configurator-button" />} className="h-12 w-full rounded-full bg-ink text-white">
                {copyReady ? copy.nav.cta : <Skeleton aria-hidden="true" className="h-4 w-32" />} <SlidersHorizontal data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
