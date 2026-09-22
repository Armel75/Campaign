/**
 * Regroupement de dates par mois, dans le fuseau horaire de l'utilisateur.
 *
 * L'agrégation est faite en mémoire à partir d'une **seule colonne de date**
 * (`select: { createdAt: true }`), volontairement :
 *  - c'est portable entre `sqlserver`, `sqlite` et `mysql` (aucun SQL propre à un dialecte) ;
 *  - le coût est d'une valeur par enregistrement, négligeable à l'échelle d'un tableau de bord ;
 *  - cela permet de supprimer tout plafond de lignes côté client (les compteurs
 *    et la tendance deviennent exacts, quel que soit le volume).
 *
 * ⚠️ Le décalage horaire est appliqué avant extraction : les bornes de période
 * envoyées par le client sont déjà des instants locaux, les regroupements doivent
 * donc l'être aussi.
 */

export type MonthlyBucket = {
  /** Clé triable `AAAA-MM`. */
  key: string;
  year: number;
  /** 1 = janvier … 12 = décembre (lisible côté client). */
  month: number;
  count: number;
};

/** Décalage maximal accepté (UTC-12 → UTC+14). */
const MAX_TZ_OFFSET_MINUTES = 14 * 60;

/**
 * Normalise le décalage horaire reçu en query string.
 * Renvoie `0` (UTC) si absent ou incohérent — jamais d'exception pour ce paramètre.
 */
export function parseTzOffsetMinutes(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || Math.abs(parsed) > MAX_TZ_OFFSET_MINUTES) {
    return 0;
  }

  return Math.trunc(parsed);
}

/**
 * Regroupe des dates par mois local, triées chronologiquement.
 * Les valeurs `null`/invalides sont ignorées ; les mois sans donnée sont absents.
 */
export function buildMonthlyBuckets(
  dates: Array<Date | null | undefined>,
  tzOffsetMinutes = 0,
): MonthlyBucket[] {
  const buckets = new Map<string, MonthlyBucket>();

  for (const date of dates) {
    if (!date || Number.isNaN(date.getTime())) continue;

    // Décalage appliqué puis lecture en UTC : équivaut à une lecture en heure locale.
    const shifted = new Date(date.getTime() + tzOffsetMinutes * 60_000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;

    const existing = buckets.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { key, year, month, count: 1 });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
}
