'use client';

import { useEffect, useMemo, useState } from 'react';
import { mergeProject, type ApiProject, type PublicProject } from '@/lib/projects';
import type { PublicCategory } from '@/lib/catalog-merge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/** Odpowiednik `usePublicFrames` dla realizacji - patrz komentarz tamże. */
export function usePublicProjects(initial: ApiProject[] | undefined, categories: PublicCategory[]) {
  const [rows, setRows] = useState<ApiProject[]>(initial ?? []);
  const [loaded, setLoaded] = useState(initial !== undefined);

  useEffect(() => {
    if (initial !== undefined) return;
    fetch(`${API_BASE}/projects`)
      .then(async (response) => { if (!response.ok) throw new Error('projects'); return response.json() as Promise<{ projects: ApiProject[] }>; })
      .then((data) => { setRows(data.projects ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  // Dane z serwera nie wymagają ponownego pobrania.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projects = useMemo(() => rows.map((row) => mergeProject(row, categories)), [rows, categories]);
  return { projects, loaded };
}

/** Stan pojedynczej realizacji dla `/realizacje/[slug]`. */
export function usePublicProject(slug: string, initial: ApiProject | null | undefined, categories: PublicCategory[]) {
  const [row, setRow] = useState<ApiProject | null>(initial ?? null);
  const [loaded, setLoaded] = useState(initial !== undefined);

  useEffect(() => {
    if (initial !== undefined) return;
    if (!slug) return;
    let cancelled = false;
    setLoaded(false);
    fetch(`${API_BASE}/projects/${encodeURIComponent(slug)}`)
      .then(async (response) => { if (!response.ok) throw new Error('project'); return response.json() as Promise<{ project: ApiProject }>; })
      .then((data) => { if (!cancelled) { setRow(data.project ?? null); setLoaded(true); } })
      .catch(() => { if (!cancelled) { setRow(null); setLoaded(true); } });
    return () => { cancelled = true; };
  // Dane z serwera nie wymagają ponownego pobrania.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const project: PublicProject | null = useMemo(() => (row ? mergeProject(row, categories) : null), [row, categories]);
  return { project, loaded };
}
