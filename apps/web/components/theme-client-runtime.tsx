'use client';

import { useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

const cssVariables: Record<string, string> = {
  background: '--background',
  foreground: '--foreground',
  surface: '--card',
  muted: '--muted',
  accent: '--accent-brand',
  accentForeground: '--accent-brand-foreground',
  border: '--border',
};

function applyTheme(theme: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, variable] of Object.entries(cssVariables)) {
    const value = theme[key];
    if (/^#[0-9a-f]{6}$/i.test(value ?? '')) root.style.setProperty(variable, value);
  }
}

/**
 * Analogicznie do FaviconRuntime: przy eksporcie statycznym serwer nie
 * zdąży wstrzyknąć <ThemeStyle> do <head> w czasie builda, więc kolory
 * z panelu podmieniamy tu, po stronie klienta.
 */
export function ThemeClientRuntime({ applied }: { applied: boolean }) {
  useEffect(() => {
    if (applied) return;
    fetch(`${API_BASE}/settings/theme`)
      .then(async (response) => { if (!response.ok) throw new Error('theme'); return response.json() as Promise<{ theme: Record<string, string> | null }>; })
      .then((data) => { if (data.theme) applyTheme(data.theme); })
      .catch(() => {});
  }, [applied]);

  return null;
}
