'use client';

import { ArrowRight, Menu, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { usePublicCopy } from '@/lib/use-public-copy';

export function SiteHeader() {
  const copy = usePublicCopy();
  const links = [
    { href: '/rowery', label: copy.nav.rowery },
    { href: '/ramy', label: copy.nav.ramy },
    { href: '/realizacje', label: copy.nav.realizacje },
    { href: '/czesci', label: copy.nav.czesci },
    { href: '/serwis', label: copy.nav.serwis },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/94 backdrop-blur-xl">
      <div className="mx-auto grid h-[72px] max-w-[1480px] grid-cols-[1fr_auto] items-center px-4 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-12">
        <a href="/" className="flex w-fit items-center" aria-label="Rexor Bikes — strona główna">
          <img src="/brand/rexor-logo.png" alt="Rexor" className="h-auto w-[132px]" />
        </a>

        <NavigationMenu className="hidden lg:flex" aria-label="Nawigacja główna">
          <NavigationMenuList className="gap-2">
            {links.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink render={<a href={link.href} />} className="px-3 py-2 text-[0.92rem] text-ink-muted hover:bg-ink-wash hover:text-black">
                  {link.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center justify-end gap-2 sm:flex">
          <Button render={<a href="/admin" aria-label={copy.nav.adminAria} />} variant="outline" size="icon-lg" className="h-11 rounded-none border-ink hover:bg-ink hover:text-white">
            <Settings aria-hidden="true" />
          </Button>
          <Button render={<a href="/konfigurator" />} variant="outline" size="lg" className="h-11 rounded-none border-ink px-5 font-mono text-xs font-semibold uppercase tracking-[0.12em] hover:bg-ink hover:text-white">
            {copy.nav.cta} <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon-lg" className="justify-self-end rounded-full sm:hidden" aria-label={copy.nav.menuAria} />}><Menu aria-hidden="true" /></SheetTrigger>
          <SheetContent side="right" className="w-[88vw] bg-white sm:max-w-sm">
            <SheetHeader className="border-b border-line p-6">
              <SheetTitle><img src="/brand/rexor-logo.png" alt="Rexor" className="h-auto w-[120px]" /></SheetTitle>
              <SheetDescription className="sr-only">Nawigacja główna</SheetDescription>
            </SheetHeader>
            <nav className="grid gap-1 px-4 py-3 text-lg font-semibold">
              {links.map((link) => <SheetClose key={link.href} render={<a href={link.href} className="rounded-xl px-3 py-3 hover:bg-ink-wash" />}>{link.label}</SheetClose>)}
            </nav>
            <div className="mt-auto p-4">
              <Button render={<a href="/konfigurator" />} className="h-12 w-full rounded-full bg-ink text-white">
                {copy.nav.cta} <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
