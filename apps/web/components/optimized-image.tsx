// Serwuje .webp dla statycznych zdjęć z public/ (kategorie, modele, ramy,
// marka) - wersje .webp generuje `npm run optimize-images` (scripts/optimize-images.mjs)
// przy buildzie. Zdjęcia spoza tych katalogów (np. wgrane w panelu admina, URLe
// z API) nie mają wygenerowanego odpowiednika, więc dostają zwykły <img>.
const STATIC_WEBP_PREFIXES = ['/categories/', '/models/', '/frames/', '/brand/'];

function webpVariant(src: string): string | null {
  if (!STATIC_WEBP_PREFIXES.some((prefix) => src.startsWith(prefix))) return null;
  if (!/\.(jpe?g|png)$/i.test(src)) return null;
  return src.replace(/\.(jpe?g|png)$/i, '.webp');
}

type OptimizedImageProps = React.ComponentProps<'img'> & {
  src: string;
  priority?: boolean;
};

export function OptimizedImage({
  src,
  priority = false,
  loading,
  decoding,
  fetchPriority,
  alt = '',
  ...rest
}: OptimizedImageProps) {
  const imgProps = {
    loading: loading ?? (priority ? ('eager' as const) : ('lazy' as const)),
    decoding: decoding ?? ('async' as const),
    fetchPriority: fetchPriority ?? (priority ? ('high' as const) : ('auto' as const)),
    ...rest,
  };
  const webp = webpVariant(src);
  if (!webp) return <img src={src} alt={alt} {...imgProps} />;
  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img src={src} alt={alt} {...imgProps} />
    </picture>
  );
}
