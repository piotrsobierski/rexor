/** Upload zdjęcia wymaga ID rekordu zwróconego przez CRUD. */
export function isSavedRecordId(value: unknown): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
}
