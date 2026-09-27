import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (event) => reject(event));
    image.src = src;
  });
}

/** Ściąga już wgrane zdjęcie z powrotem jako File, żeby przepuścić je przez ten sam kadr co świeży upload. */
export async function fetchImageAsFile(url: string, fileName = 'image'): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Nie udało się pobrać obecnego zdjęcia do przycięcia.');
  }
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : blob.type === 'image/avif' ? 'avif' : 'jpg';
  return new File([blob], `${fileName}.${extension}`, { type: blob.type || 'image/jpeg' });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = reader.result;
      resolve(typeof result === 'string' ? result : '');
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

/**
 * Tnie obraz do zaznaczonego prostokąta (react-easy-crop daje go w pikselach
 * oryginału) i skaluje w dół, jeśli wynik i tak byłby większy niż docelowe
 * miejsce potrzebuje - upload i tak przechodzi potem przez compressUploadImage,
 * to tylko unika trzymania w pamięci/przesyłania niepotrzebnie wielkich kadrów.
 */
export async function cropImageToFile(
  imageSrc: string,
  cropPixels: Area,
  fileName: string,
  mimeType: string,
  maxOutputDimension = 2400,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const scale = Math.min(1, maxOutputDimension / Math.max(cropPixels.width, cropPixels.height));
  const outputWidth = Math.max(1, Math.round(cropPixels.width * scale));
  const outputHeight = Math.max(1, Math.round(cropPixels.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Przeglądarka nie obsługuje przycinania obrazu (brak canvas 2D).');
  }

  // Wyzoomowanie poniżej 1 daje kadr większy niż samo zdjęcie (albo z ujemnym
  // x/y) - dopełniamy białym tłem, a rysujemy tylko część kadru, która
  // faktycznie nakłada się na zdjęcie, przesuniętą o tyle samo w wyniku.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outputWidth, outputHeight);

  const srcX = Math.max(0, cropPixels.x);
  const srcY = Math.max(0, cropPixels.y);
  const srcRight = Math.min(image.naturalWidth, cropPixels.x + cropPixels.width);
  const srcBottom = Math.min(image.naturalHeight, cropPixels.y + cropPixels.height);
  const srcWidth = srcRight - srcX;
  const srcHeight = srcBottom - srcY;

  if (srcWidth > 0 && srcHeight > 0) {
    const destX = (srcX - cropPixels.x) * scale;
    const destY = (srcY - cropPixels.y) * scale;
    context.drawImage(
      image,
      srcX,
      srcY,
      srcWidth,
      srcHeight,
      destX,
      destY,
      srcWidth * scale,
      srcHeight * scale,
    );
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType === 'image/png' ? 'image/png' : 'image/jpeg', 0.92),
  );
  if (!blob) {
    throw new Error('Nie udało się przygotować przyciętego obrazu.');
  }
  const outName = fileName.replace(/\.\w+$/, '') + (mimeType === 'image/png' ? '.png' : '.jpg');
  return new File([blob], outName, { type: blob.type });
}
