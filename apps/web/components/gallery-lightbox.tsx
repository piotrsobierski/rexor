'use client';

import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { SiteCopy } from '@/lib/copy';

/** Shared fullscreen viewer for product galleries; the dialog traps focus and handles Escape. */
export function GalleryImageButton({ images, index = 0, title, labels, className, children }: {
  images: string[];
  index?: number;
  title: string;
  labels: SiteCopy['gallery'];
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const photos = images.filter(Boolean);
  const active = Math.min(selected, Math.max(0, photos.length - 1));
  function move(delta: number) {
    setSelected((active + delta + photos.length) % photos.length);
    setZoomed(false);
  }
  const control = 'grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  return <>
    <button type="button" disabled={!photos.length} aria-label={`${labels.open}: ${title}`} className={`group/zoom relative block min-w-0 w-full max-w-full overflow-hidden cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-4 ${className ?? ''}`} onClick={() => {
      setSelected(Math.min(index, photos.length - 1));
      setZoomed(false);
      setOpen(true);
    }}>
      <span className="absolute inset-0 block min-w-0 overflow-hidden [padding:inherit] [&_picture]:block [&_picture]:size-full [&_picture]:min-w-0 [&_img]:block [&_img]:size-full [&_img]:max-w-full">
        {children}
      </span>
      {photos.length > 0 && <span aria-hidden="true" className="pointer-events-none absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-white/90 text-black shadow-sm transition-transform group-hover/zoom:scale-110"><Maximize2 className="size-4" /></span>}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="flex h-dvh w-full max-w-none overflow-hidden flex-col gap-0 rounded-none bg-[#101113] p-0 text-white ring-0 sm:max-w-none" data-testid="gallery-lightbox" onKeyDown={(event) => {
        if (photos.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}>
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1"><DialogTitle className="truncate text-sm font-medium text-white">{title}</DialogTitle><p className="mt-1 text-xs tabular-nums text-white/50">{active + 1} / {photos.length}</p></div>
          <button type="button" className={control} aria-label={zoomed ? labels.zoomOut : labels.zoomIn} aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>{zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}</button>
          <button type="button" className={control} aria-label={labels.close} onClick={() => setOpen(false)}><X className="size-5" /></button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div key={`${active}-${zoomed}`} className="h-full overflow-auto overscroll-contain p-4 sm:p-8">
            <button type="button" aria-label={zoomed ? labels.zoomOut : labels.zoomIn} className={`block ${zoomed ? 'h-[200%] w-[200%] cursor-zoom-out' : 'h-full w-full cursor-zoom-in'} focus-visible:outline-2 focus-visible:outline-white`} onClick={() => setZoomed(!zoomed)}>
              {photos[active] && <img src={photos[active]} alt={`${title} — ${active + 1}`} className="size-full object-contain" draggable={false} />}
            </button>
          </div>
          {photos.length > 1 && <>
            <button type="button" className={`${control} absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 sm:left-6`} aria-label={labels.previous} onClick={() => move(-1)}><ChevronLeft className="size-6" /></button>
            <button type="button" className={`${control} absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 sm:right-6`} aria-label={labels.next} onClick={() => move(1)}><ChevronRight className="size-6" /></button>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
