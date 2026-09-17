/** Flagi z PDO mogą być liczbą lub tekstem, a po edycji wartością boolean. */
export function adminFlagEnabled(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}
