import type { LucideIcon } from 'lucide-react';
import { Award, Bike, Compass, Flag, Map, Mountain, Route, Sun, Timer, TreePine, Wind, Zap } from 'lucide-react';

/** Zestaw ikon do wyboru dla znaczka kategorii w panelu (Kategorie) i na stronie głównej. */
export const CATEGORY_ICON_PRESETS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'bike', label: 'Rower', icon: Bike },
  { key: 'mountain', label: 'Góry (MTB)', icon: Mountain },
  { key: 'route', label: 'Szosa', icon: Route },
  { key: 'map', label: 'Trasa (gravel)', icon: Map },
  { key: 'zap', label: 'Elektryczny', icon: Zap },
  { key: 'compass', label: 'Turystyka', icon: Compass },
  { key: 'tree-pine', label: 'Las / trail', icon: TreePine },
  { key: 'sun', label: 'Letni / rekreacja', icon: Sun },
  { key: 'wind', label: 'Aero / prędkość', icon: Wind },
  { key: 'timer', label: 'Wyczyn', icon: Timer },
  { key: 'flag', label: 'Wyścigowy', icon: Flag },
  { key: 'award', label: 'Premium', icon: Award },
];

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICON_PRESETS.map((preset) => [preset.key, preset.icon]),
);

/**
 * Kategorie założone przed dodaniem presetów nie mają `icon_key` — dopóki
 * ktoś go nie ustawi w panelu, dostają tę samą ikonę co wcześniej (dawna
 * mapa po slugu, na stałe w kodzie), zamiast domyślnego roweru dla wszystkich.
 */
const LEGACY_SLUG_ICONS: Record<string, LucideIcon> = {
  szosa: Route,
  gravel: Map,
  mtb: Mountain,
  'miejski-turystyczny': Bike,
  elektryczne: Zap,
};

export function resolveCategoryIcon(iconKey: string | null | undefined, slug: string): LucideIcon {
  if (iconKey && CATEGORY_ICON_MAP[iconKey]) return CATEGORY_ICON_MAP[iconKey];
  return LEGACY_SLUG_ICONS[slug] ?? Bike;
}
