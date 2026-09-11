'use client';

import { ArrowRight, Menu, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const links = [
  { href: '/rowery', label: 'Rowery' },
  { href: '/ramy', label: 'Ramy' },
  { href: '/czesci', label: 'Części' },
  { href: '/serwis', label: 'Serwis' },
];

export function SiteHeader() {
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
          <Button render={<a href="/admin" aria-label="Panel administracyjny" />} variant="outline" size="icon-lg" className="h-11 rounded-none border-ink hover:bg-ink hover:text-white">
            <Settings aria-hidden="true" />
          </Button>
          <Button render={<a href="/konfigurator" />} variant="outline" size="lg" className="h-11 rounded-none border-ink px-5 font-mono text-xs font-semibold uppercase tracking-[0.12em] hover:bg-ink hover:text-white">
            Stwórz własny projekt <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon-lg" className="justify-self-end rounded-full sm:hidden" aria-label="Otwórz menu" />}><Menu aria-hidden="true" /></SheetTrigger>
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
                Stwórz własny projekt <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
