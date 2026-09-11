/**
 * Kolory motywu wstrzykujemy w pierwszym renderze, w <style> w dokumencie.
 * Wcześniej ustawiał je useEffect po pobraniu z API, więc strona pokazywała
 * najpierw kolory z arkusza, a potem kolory z panelu — to samo mignięcie,
 * które było widać na stronie serwisu.
 */

const cssVariables: Record<string, string> = {
  background: '--background',
  foreground: '--foreground',
  surface: '--card',
  muted: '--muted',
  accent: '--accent-brand',
  accentForeground: '--accent-brand-foreground',
  border: '--border',
};

export function ThemeStyle({ theme }: { theme: Record<string, string> | null }) {
  if (!theme) return null;
  const declarations = Object.entries(cssVariables)
    .filter(([key]) => /^#[0-9a-f]{6}$/i.test(theme[key] ?? ''))
    .map(([key, variable]) => `${variable}:${theme[key]}`);
  if (declarations.length === 0) return null;
  // Wartości są walidowane wyżej jako #RRGGBB, więc nie mogą zamknąć <style>.
  return <style>{`:root{${declarations.join(';')}}`}</style>;
}
