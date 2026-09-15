'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Ostatni segment realnego adresu - token linku konfiguracji, public_id itp.
 *
 * Eksport statyczny wypuszcza dla tych tras jedną powłokę "_" (patrz
 * generateStaticParams + deploy/public-html.htaccess), więc parametru nie ma
 * ani w useParams(), ani w usePathname() podczas hydratacji: oba czytają wtedy
 * ścieżkę z ładunku powłoki, czyli ".../_", i dopiero po hydratacji
 * usePathname() przełącza się na window.location. Komponenty, które na
 * pierwszej ścieżce zapisują błąd do stanu, zostawały z tym błędem na ekranie,
 * bo przykrywał poprawną odpowiedź przychodzącą chwilę później.
 *
 * Dlatego token bierzemy wprost z window.location (zawsze prawdziwy adres),
 * a usePathname() służy tylko za sygnał zmiany przy nawigacji routerem.
 * Pusty string do czasu zamontowania - wtedy komponent pokazuje wczytywanie.
 */
export function useRouteToken(): string {
  const pathname = usePathname();
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(window.location.pathname.split('/').filter(Boolean).pop() ?? '');
  }, [pathname]);

  return token;
}
