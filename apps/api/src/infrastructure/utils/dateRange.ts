/**
 * Bornes de dates lues dans les query strings des endpoints de liste.
 *
 * Formats acceptés :
 *  - `AAAA-MM-JJ`   → bornes de journée (`from` = 00:00:00.000, `to` = 23:59:59.999, en UTC)
 *  - date ISO 8601  → instant exact, tel que fourni par le client (recommandé pour
 *                     respecter le fuseau horaire de l'utilisateur)
 *
 * Règles :
 *  - paramètre absent ou vide → aucune borne (donc aucun filtre de date)
 *  - valeur invalide ou plage inversée → `error` renseigné, à charge du routeur
 *    de répondre 400 (les routes renvoient déjà leurs erreurs de validation en inline)
 */

export type ParsedDateRange = {
  /** Borne inférieure inclusive. */
  gte?: Date;
  /** Borne supérieure inclusive. */
  lte?: Date;
  /** Message d'erreur si un paramètre est invalide. */
  error?: string;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseBoundary(
  paramName: string,
  raw: unknown,
  boundary: 'start' | 'end',
): Date | undefined {
  if (raw === undefined || raw === null) return undefined;

  const value = String(raw).trim();
  if (value === '') return undefined;

  const iso = DATE_ONLY_PATTERN.test(value)
    ? `${value}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`
    : value;

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Paramètre « ${paramName} » invalide : format attendu AAAA-MM-JJ ou ISO 8601.`,
    );
  }

  return date;
}

/**
 * Lit une paire de bornes dans `req.query`.
 * Les noms des paramètres sont paramétrables afin de gérer plusieurs axes de dates
 * (ex. `from`/`to` pour la date de création, `dueFrom`/`dueTo` pour l'échéance).
 */
export function parseDateRange(
  query: Record<string, unknown>,
  fromParam = 'from',
  toParam = 'to',
): ParsedDateRange {
  try {
    const gte = parseBoundary(fromParam, query[fromParam], 'start');
    const lte = parseBoundary(toParam, query[toParam], 'end');

    if (gte && lte && gte.getTime() > lte.getTime()) {
      return {
        error: `Période invalide : « ${fromParam} » doit être antérieure ou égale à « ${toParam} ».`,
      };
    }

    return { gte, lte };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Paramètre de date invalide.',
    };
  }
}

/**
 * Convertit une plage en filtre Prisma (`gte`/`lte`).
 * Renvoie `undefined` si aucune borne n'est fournie, pour éviter un filtre inutile.
 */
export function toPrismaDateFilter(
  range: ParsedDateRange,
): { gte?: Date; lte?: Date } | undefined {
  if (!range.gte && !range.lte) return undefined;

  return {
    ...(range.gte ? { gte: range.gte } : {}),
    ...(range.lte ? { lte: range.lte } : {}),
  };
}
