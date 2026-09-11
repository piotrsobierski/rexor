'use client';

import { useEffect } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

export function ThemeRuntime() {
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/settings/theme`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(({ theme }) => {
        if (!theme) return;
        const root = document.documentElement;
        const variables: Record<string, string> = {
          background: '--background', foreground: '--foreground', surface: '--card',
          muted: '--muted', accent: '--accent-brand', accentForeground: '--accent-brand-foreground', border: '--border',
        };
        Object.entries(variables).forEach(([key, variable]) => {
          if (/^#[0-9a-f]{6}$/i.test(theme[key] ?? '')) root.style.setProperty(variable, theme[key]);
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return null;
}
