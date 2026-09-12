// Wydzielone z admin-panel.tsx (który ma 'use client'): generateStaticParams()
// w app/admin/[tab]/page.tsx wykonuje się po stronie builda, więc import z
// modułu klienckiego dawałby tam nie tablicę, a zaślepkę granicy klient/serwer.
export const ADMIN_TAB_SLUGS = ['models', 'categories', 'equipment', 'parts', 'batteries', 'service', 'theme', 'inquiries', 'activity-log'] as const;
export type AdminTabSlug = (typeof ADMIN_TAB_SLUGS)[number];
export const isAdminTabSlug = (value: string): value is AdminTabSlug => (ADMIN_TAB_SLUGS as readonly string[]).includes(value);
