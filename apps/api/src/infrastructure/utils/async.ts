/**
 * Exécute une fonction async sur chaque élément avec une concurrence limitée,
 * en préservant l'ordre des résultats.
 *
 * Exemple d'usage : paralléliser des appels externes (Sage X3) sans saturer
 * le pool de connexions (max 10 pour X3).
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const i = nextIndex;
      nextIndex += 1;
      results[i] = await fn(items[i], i);
    }
  };

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
