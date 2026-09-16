#!/usr/bin/env node
// Generuje wersje .webp dla statycznych zdjęć w public/ (kategorie, modele,
// ramy, marka) i uruchamia się przed `vinext build`, bo hosting docelowy to
// zwykły FTP/PHP bez serwera Node - nie mamy runtime'owego optymalizatora
// obrazów jak w Next.js, więc konwersja musi się zdarzyć w buildzie.
import { readdir, stat, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');
const targetDirs = ['categories', 'models', 'frames', 'brand'];
const sourceExtensions = new Set(['.jpg', '.jpeg', '.png']);
const maxDimension = 2000;
const quality = 78;

async function collectImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(full)));
    } else if (sourceExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function optimize(sourcePath) {
  const webpPath = sourcePath.replace(extname(sourcePath), '.webp');
  const [sourceStat, webpStat] = await Promise.all([
    stat(sourcePath),
    stat(webpPath).catch(() => null),
  ]);
  if (webpStat && webpStat.mtimeMs >= sourceStat.mtimeMs) {
    return { path: webpPath, skipped: true };
  }
  await mkdir(dirname(webpPath), { recursive: true });
  await sharp(sourcePath)
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toFile(webpPath);
  return { path: webpPath, skipped: false };
}

async function main() {
  let converted = 0;
  let skipped = 0;
  for (const name of targetDirs) {
    const dir = join(publicDir, name);
    const exists = await stat(dir).catch(() => null);
    if (!exists) continue;
    const images = await collectImages(dir);
    for (const image of images) {
      const result = await optimize(image);
      if (result.skipped) skipped += 1;
      else converted += 1;
    }
  }
  console.log(`[optimize-images] ${converted} przekonwertowane, ${skipped} bez zmian.`);
}

main().catch((error) => {
  console.error('[optimize-images] Nie udało się wygenerować wersji .webp:', error);
  process.exit(1);
});
