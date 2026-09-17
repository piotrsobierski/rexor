// Rozpoznajemy tylko opisy startowe; treści zmienione w panelu zachowujemy.
const descriptions: Record<string, { original: string; text: string }> = {
  'szosa': { original: 'Lekkie rowery stworzone do szybkiej i efektywnej jazdy po asfalcie.', text: 'Lekkie rowery do szybkiej jazdy po asfalcie i długich tras szosowych.' },
  'gravel': { original: 'Uniwersalne rowery na asfalt, szuter i dłuższe wyprawy.', text: 'Uniwersalne rowery na asfalt, szuter i długie wyprawy poza miasto.' },
  'mtb': { original: 'Rowery do jazdy terenowej, górskiej i wymagających tras.', text: 'Wytrzymałe rowery na górskie szlaki i wymagające trasy terenowe.' },
  'miejski-turystyczny': { original: 'Wygodne rowery do codziennych przejazdów i turystyki.', text: 'Wygodne rowery do codziennych przejazdów i turystycznych wypraw.' },
  'elektryczne': { original: 'Napęd i wspomaganie powyżej norm roweru elektrycznego (250 W / 25 km/h).', text: 'Pojazdy z napędem ponad normy roweru elektrycznego (250 W / 25 km/h).' },
};

export function categoryCardDescription(slug: string, description?: string | null): string {
  const known = descriptions[slug];
  return known && (!description || description === known.original) ? known.text : description ?? '';
}
