import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Adres pliku wgranego przez panel.
 *
 * `/admin/media` zwraca gołą ścieżkę (`/uploads/…`) i tak ma trafiać do bazy.
 * Część kolumn (`default_image_path`, `cover_image_path`, `image_path`) ma
 * jednak wiersze zapisane jeszcze z doklejonym `API_BASE`: na produkcji
 * `/api/uploads/…`, lokalnie pełny `http://…`. Doklejenie prefiksu drugi raz
 * dawało `/api/api/uploads/…` i 404 na każdym takim zdjęciu, więc prefiks
 * z wartości ucinamy zamiast wymagać migracji danych.
 */
export function mediaSrc(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const bare = path.replace(/^\/api(?=\/)/, '');
  return `${API_BASE}${bare.startsWith('/') ? bare : `/${bare}`}`;
}
