'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ZoomIn, Crop } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { cropImageToFile, fetchImageAsFile, readFileAsDataUrl } from '@/lib/image-crop';

/**
 * Kilka gotowych "makiet" tego, gdzie wylądowanie zdjęcia faktycznie się
 * pokaże - żeby admin widział nie goły kwadrat kadru, tylko przybliżony
 * układ docelowej strony (kafelek/karta, szeroki baner, kwadratowa miniatura)
 * z przykładowym tekstem zamiast prawdziwej treści.
 */
export type CropPreviewVariant = 'tile' | 'banner' | 'square';

type ImageCropDialogProps = {
  file: File | null;
  aspect: number;
  title?: string;
  previewVariant?: CropPreviewVariant;
  previewLabel?: string;
  objectFit?: 'cover' | 'contain';
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

/** Poniżej 1 zdjęcie jest mniejsze niż ramka kadru - puste miejsce dopełnia biel (patrz cropImageToFile). */
const MIN_ZOOM = 0.3;

const LOREM_TITLE = 'Lorem ipsum dolor';
const LOREM_TEXT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

export function ImageCropDialog({
  file,
  aspect,
  title = 'Dopasuj zdjęcie',
  previewVariant = 'tile',
  previewLabel,
  objectFit = 'cover',
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      setNaturalSize(null);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    let cancelled = false;
    void readFileAsDataUrl(file).then((dataUrl) => {
      if (cancelled) return;
      setImageSrc(dataUrl);
      const probe = new Image();
      probe.onload = () => {
        if (!cancelled) setNaturalSize({ width: probe.naturalWidth, height: probe.naturalHeight });
      };
      probe.src = dataUrl;
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const previewSrc = imageSrc;

  async function handleConfirm() {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const cropped = await cropImageToFile(imageSrc, croppedAreaPixels, file.name, file.type);
      onConfirm(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przyciąć zdjęcia.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-3">
            <div className="relative h-72 w-full overflow-hidden rounded-xl border border-line bg-white sm:h-80">
              {previewSrc && (
                <Cropper
                  image={previewSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  objectFit="contain"
                  minZoom={MIN_ZOOM}
                  maxZoom={4}
                  restrictPosition={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
                  onCropAreaChange={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <ZoomIn className="size-4 shrink-0 text-ink-muted" />
              <Slider
                min={MIN_ZOOM}
                max={4}
                step={0.01}
                value={[zoom]}
                onValueChange={(value) => setZoom(Array.isArray(value) ? (value[0] ?? 1) : value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-ink-subtle">
              Przeciągnij zdjęcie, żeby przesunąć kadr, suwakiem przybliż lub
              oddal. Puste miejsce wokół zdjęcia zostanie białe - ramka
              pokazuje dokładnie to, co będzie widoczne.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-medium text-ink-muted">
              Podgląd — tak będzie się wyświetlać
            </p>
            <CropPreviewMock
              variant={previewVariant}
              label={previewLabel}
              imageSrc={previewSrc}
              naturalSize={naturalSize}
              cropPixels={croppedAreaPixels}
              aspect={aspect}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Anuluj
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy || !croppedAreaPixels}>
            {busy ? 'Przycinam…' : 'Użyj tego kadru'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Statyczne przybliżenie tego, jak wygląda docelowe miejsce (kafelek, baner,
 * kwadratowa miniatura) - nie jest to renderowany na żywo komponent strony
 * (tych miejsc jest kilkanaście, każde z innym layoutem), tylko wspólna
 * makieta z przykładowym tekstem, żeby proporcje i kadr były widoczne w
 * kontekście zamiast gołego prostokąta.
 */
const FRAME_WIDTH_PX: Record<CropPreviewVariant, number> = {
  tile: 320,
  banner: 320,
  square: 80,
};

function CropPreviewMock({
  variant,
  label,
  imageSrc,
  naturalSize,
  cropPixels,
  aspect,
}: {
  variant: CropPreviewVariant;
  label?: string;
  imageSrc: string | null;
  naturalSize: { width: number; height: number } | null;
  cropPixels: Area | null;
  aspect: number;
}) {
  const frameWidthPx = FRAME_WIDTH_PX[variant];

  // Po przycięciu zdjęcie ma DOKŁADNIE proporcje ramki, więc cover/contain
  // wychodzi na to samo - stąd zawsze ten sam, dokładny podgląd odtworzony z
  // croppedAreaPixels (prostokąt w pikselach oryginału), zamiast duplikować
  // drugą instancję Croppera. Tło białe pod spodem = to, co wyzoomowanie
  // poniżej 1 faktycznie zostawi widoczne w rogach (patrz cropImageToFile).
  const cropStyle = useMemo(() => {
    if (!imageSrc || !naturalSize || !cropPixels || cropPixels.width <= 0) {
      return undefined;
    }
    const scale = frameWidthPx / cropPixels.width;
    return {
      backgroundImage: `url(${imageSrc})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${naturalSize.width * scale}px ${naturalSize.height * scale}px`,
      backgroundPosition: `${-cropPixels.x * scale}px ${-cropPixels.y * scale}px`,
    } as const;
  }, [imageSrc, naturalSize, cropPixels, frameWidthPx]);

  const frame = (
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{ width: frameWidthPx, aspectRatio: aspect, ...cropStyle }}
    />
  );

  if (variant === 'banner') {
    return (
      <div className="overflow-hidden rounded-2xl border border-line" style={{ width: frameWidthPx }}>
        {frame}
        <div className="space-y-1.5 p-3">
          <div className="h-3 w-2/3 rounded bg-[var(--muted)]" />
          <p className="text-[0.7rem] text-ink-subtle">{label ?? LOREM_TITLE}</p>
        </div>
      </div>
    );
  }

  if (variant === 'square') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
        <div className="shrink-0 overflow-hidden rounded-lg bg-white" style={{ width: frameWidthPx, aspectRatio: aspect, ...cropStyle }} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-2.5 w-3/4 rounded bg-[var(--muted)]" />
          <p className="truncate text-[0.7rem] text-ink-subtle">{label ?? LOREM_TEXT}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line p-3" style={{ width: frameWidthPx + 24 }}>
      {frame}
      <div className="mt-2.5 space-y-1.5">
        <div className="h-2.5 w-1/2 rounded bg-[var(--muted)]" />
        <p className="text-[0.7rem] text-ink-subtle">{label ?? LOREM_TEXT}</p>
      </div>
    </div>
  );
}

/**
 * Punkt wejścia używany we wszystkich miejscach panelu, gdzie admin wgrywa
 * zdjęcie na konkretne, znane z góry miejsce (kafelek, baner, okładka,
 * miniatura części...). Zastępuje goły `&lt;input type="file"&gt;` -> upload:
 * wybór pliku zawsze otwiera kadr z podglądem docelowych proporcji, dopiero
 * potwierdzony kadr trafia do `onCropped` (a stamtąd do istniejącego
 * uploadu/kompresji/PATCH-a, bez zmian w tamtej logice).
 *
 * `multiple` przetwarza wybrane pliki po kolei, jeden kadr na raz - łatwiej
 * dopasować każde zdjęcie z osobna niż zgadywać wspólny kadr dla całej paczki.
 */
export function CroppedImageInput({
  aspect,
  previewVariant = 'tile',
  previewLabel,
  objectFit = 'cover',
  dialogTitle,
  disabled,
  multiple,
  accept = 'image/jpeg,image/png,image/webp,image/avif',
  className,
  children,
  onCropped,
}: {
  aspect: number;
  previewVariant?: CropPreviewVariant;
  previewLabel?: string;
  objectFit?: 'cover' | 'contain';
  dialogTitle?: string;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string;
  className?: string;
  children: ReactNode;
  onCropped: (file: File) => void;
}) {
  const [, setQueue] = useState<File[]>([]);
  const [current, setCurrent] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function startQueue(files: File[]) {
    if (files.length === 0) return;
    setQueue(files.slice(1));
    setCurrent(files[0]);
  }

  function advance() {
    setQueue((rest) => {
      if (rest.length === 0) {
        setCurrent(null);
        return rest;
      }
      setCurrent(rest[0]);
      return rest.slice(1);
    });
  }

  return (
    <>
      <Label className={cn('cursor-pointer', className)}>
        {children}
        <input
          ref={inputRef}
          type="file"
          disabled={disabled}
          multiple={multiple}
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (inputRef.current) inputRef.current.value = '';
            startQueue(files);
          }}
        />
      </Label>
      <ImageCropDialog
        file={current}
        aspect={aspect}
        previewVariant={previewVariant}
        previewLabel={previewLabel}
        objectFit={objectFit}
        title={dialogTitle}
        onCancel={() => {
          setQueue([]);
          setCurrent(null);
        }}
        onConfirm={(file) => {
          onCropped(file);
          advance();
        }}
      />
    </>
  );
}

/**
 * Odpowiednik CroppedImageInput dla zdjęcia, które JUŻ wisi na encji - ściąga
 * je z powrotem jako plik i otwiera ten sam dialog kadrowania, zamiast
 * wymagać ponownego wgrania z dysku, żeby poprawić kadr istniejącego zdjęcia.
 */
export function RecropButton({
  imageUrl,
  fileName = 'zdjecie',
  aspect,
  previewVariant = 'tile',
  previewLabel,
  objectFit = 'cover',
  dialogTitle,
  disabled,
  className,
  children,
  onCropped,
}: {
  imageUrl: string;
  fileName?: string;
  aspect: number;
  previewVariant?: CropPreviewVariant;
  previewLabel?: string;
  objectFit?: 'cover' | 'contain';
  dialogTitle?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  onCropped: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      setFile(await fetchImageAsFile(imageUrl, fileName));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się otworzyć zdjęcia do przycięcia.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || loading}
        className={className}
        onClick={() => void open()}
        title={error ?? undefined}
      >
        <Crop className="size-3.5" />
        {children}
      </Button>
      <ImageCropDialog
        file={file}
        aspect={aspect}
        previewVariant={previewVariant}
        previewLabel={previewLabel}
        objectFit={objectFit}
        title={dialogTitle}
        onCancel={() => setFile(null)}
        onConfirm={(cropped) => {
          setFile(null);
          onCropped(cropped);
        }}
      />
    </>
  );
}
