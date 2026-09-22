/**
 * Lecture des paramètres de query string transverses.
 */

/**
 * Lit un paramètre `include` de type liste CSV (ex. `?include=monthly,statuses`).
 * Renvoie un tableau vide si absent. Les valeurs sont normalisées en minuscules.
 *
 * Convention : un paramètre `include` absent n'active **aucune** agrégation
 * supplémentaire → aucune requête ni charge supplémentaire pour les appelants existants.
 */
export function parseIncludeList(value: unknown): string[] {
  if (value === undefined || value === null) return [];

  const raw = Array.isArray(value) ? value.join(',') : String(value);

  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Lit une liste CSV validée (ex. `?excludeStatus=TERMINE,ANNULE`).
 * Renvoie `{ values, invalid }` pour que le routeur puisse répondre 400 sur une valeur inconnue.
 */
export function parseCsvList(
  value: unknown,
  allowedValues: readonly string[],
): { values: string[]; invalid: string[] } {
  if (value === undefined || value === null) return { values: [], invalid: [] };

  const raw = Array.isArray(value) ? value.join(',') : String(value);

  const values = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const invalid = values.filter((item) => !allowedValues.includes(item));

  return { values, invalid };
}
