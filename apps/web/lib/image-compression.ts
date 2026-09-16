import imageCompression from 'browser-image-compression';

const MAX_SIZE_MB = 2;
const MAX_DIMENSION_PX = 2400;

/**
 * Kompresuje zdjęcie w przeglądarce przed wysyłką do /admin/media. Backend
 * (apps/api/src/AdminService.php) zapisuje pliki bez żadnej obróbki, a hosting
 * to zwykły PHP/FTP bez serwera Node, więc nie ma gdzie tego zrobić po drodze -
 * jedyny moment na optymalizację jest tu, zanim plik opuści przeglądarkę.
 */
export async function compressUploadImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_DIMENSION_PX,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.82,
    });
  } catch (error) {
    console.warn('Nie udało się skompresować zdjęcia, wysyłam oryginał.', error);
    return file;
  }
}
