/**
 * Résolution des périodes du tableau de bord.
 *
 * Deux familles coexistent volontairement :
 *  - `preset`     : fenêtres GLISSANTES (7j / 30j / 90j / Année / Tout)
 *  - `calendrier` : périodes CALENDAIRES (un mois précis, ou une année complète)
 *
 * Les deux produisent la même structure `ResolvedPeriod`, afin que tous les widgets
 * consomment une source de vérité unique (`from` / `to`) et qu'un libellé non ambigu
 * (glissant vs calendaire) puisse être affiché à l'utilisateur.
 *
 * ⚠️ Les bornes sont calculées en heure LOCALE puis envoyées en ISO (`toISOString`),
 * ce qui évite tout décalage de fuseau côté serveur.
 */

export type PeriodPreset = '7j' | '30j' | '90j' | 'annee' | 'tout';

export type CalendarPeriod = {
  year: number;
  /** 0 = janvier … 11 = décembre. `null` = tous les mois (vue annuelle). */
  month: number | null;
};

export type ResolvedPeriod = {
  source: 'preset' | 'calendrier';
  preset: PeriodPreset | null;
  calendar: CalendarPeriod | null;
  /** Borne inférieure inclusive (`null` = pas de borne). */
  from: Date | null;
  /** Borne supérieure inclusive (`null` = pas de borne). */
  to: Date | null;
  /** Libellé court (chips). */
  shortLabel: string;
  /** Libellé explicite, résolvant l'ambiguïté glissant / calendaire. */
  label: string;
  /** `true` si aucune borne n'est appliquée (vue cumulée). */
  isAllTime: boolean;
};

export const PERIOD_PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: '7j', label: '7j' },
  { value: '30j', label: '30j' },
  { value: '90j', label: '90j' },
  { value: 'annee', label: 'Année' },
  { value: 'tout', label: 'Tout' },
];

/** Période appliquée par défaut (aucun paramètre d'URL). */
export const DEFAULT_PERIOD_PRESET: PeriodPreset = 'annee';

/** Nom du paramètre d'URL portant la période (vue partageable). */
export const PERIOD_SEARCH_PARAM = 'periode';

const PRESET_VALUES: string[] = PERIOD_PRESETS.map((preset) => preset.value);

export const MONTH_SHORT_LABELS = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
];

const MONTH_FULL_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Libellé jour court (ex. « 21/09/2026 »). */
export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR');
}

/** Années proposées dans le sélecteur : année courante puis les précédentes. */
export function getSelectableYears(count = 5, now: Date = new Date()): number[] {
  const currentYear = now.getFullYear();
  return Array.from({ length: count }, (_, index) => currentYear - index);
}

/** Plage calendaire (mois précis ou année complète). */
function resolveCalendarPeriod(calendar: CalendarPeriod): ResolvedPeriod {
  const { year, month } = calendar;

  if (month === null) {
    return {
      source: 'calendrier',
      preset: null,
      calendar,
      from: new Date(year, 0, 1, 0, 0, 0, 0),
      to: endOfDay(new Date(year, 11, 31)),
      shortLabel: String(year),
      label: `${year} · Vue annuelle`,
      isAllTime: false,
    };
  }

  const from = new Date(year, month, 1, 0, 0, 0, 0);
  // Jour 0 du mois suivant = dernier jour du mois courant
  const to = endOfDay(new Date(year, month + 1, 0));

  return {
    source: 'calendrier',
    preset: null,
    calendar,
    from,
    to,
    shortLabel: MONTH_SHORT_LABELS[month],
    label: `${MONTH_FULL_LABELS[month]} ${year}`,
    isAllTime: false,
  };
}

/**
 * Résout la période effective.
 * Un calendrier sélectionné prend le pas sur le preset (les chips restent visibles
 * pour revenir instantanément à une fenêtre glissante).
 */
export function resolvePeriod(
  preset: PeriodPreset,
  calendar: CalendarPeriod | null,
  now: Date = new Date(),
): ResolvedPeriod {
  if (calendar) {
    return resolveCalendarPeriod(calendar);
  }

  const { year, month, date } = {
    year: now.getFullYear(),
    month: now.getMonth(),
    date: now.getDate(),
  };
  const to = endOfDay(now);

  switch (preset) {
    case '7j': {
      const from = startOfDay(new Date(year, month, date - 7));
      return {
        source: 'preset',
        preset,
        calendar: null,
        from,
        to,
        shortLabel: '7j',
        label: `7 derniers jours (depuis le ${formatDayLabel(from)})`,
        isAllTime: false,
      };
    }

    case '30j': {
      const from = startOfDay(new Date(year, month - 1, date));
      return {
        source: 'preset',
        preset,
        calendar: null,
        from,
        to,
        shortLabel: '30j',
        label: `30 derniers jours (depuis le ${formatDayLabel(from)})`,
        isAllTime: false,
      };
    }

    case '90j': {
      const from = startOfDay(new Date(year, month - 3, date));
      return {
        source: 'preset',
        preset,
        calendar: null,
        from,
        to,
        shortLabel: '90j',
        label: `90 derniers jours (depuis le ${formatDayLabel(from)})`,
        isAllTime: false,
      };
    }

    case 'annee': {
      const from = new Date(year, 0, 1, 0, 0, 0, 0);
      return {
        source: 'preset',
        preset,
        calendar: null,
        from,
        to,
        shortLabel: 'Année',
        label: `Année ${year} (depuis le ${formatDayLabel(from)})`,
        isAllTime: false,
      };
    }

    case 'tout':
    default:
      return {
        source: 'preset',
        preset: 'tout',
        calendar: null,
        from: null,
        to: null,
        shortLabel: 'Tout',
        label: 'Tout l’historique (aucune borne)',
        isAllTime: true,
      };
  }
}

/**
 * Lit la période depuis l'URL. Formats acceptés pour `?periode=` :
 *  - `7j` | `30j` | `90j` | `annee` | `tout` → fenêtre glissante
 *  - `AAAA`                                   → année calendaire complète
 *  - `AAAA-MM`                                → mois calendaire précis
 *
 * Toute valeur absente ou inconnue retombe sur la période par défaut : une URL
 * invalide ne doit jamais casser la page.
 */
export function readPeriodFromUrl(searchParams: URLSearchParams): {
  preset: PeriodPreset;
  calendar: CalendarPeriod | null;
} {
  const raw = (searchParams.get(PERIOD_SEARCH_PARAM) || '').trim();

  if (!raw) return { preset: DEFAULT_PERIOD_PRESET, calendar: null };

  if (PRESET_VALUES.includes(raw)) {
    return { preset: raw as PeriodPreset, calendar: null };
  }

  const yearOnly = /^(\d{4})$/.exec(raw);
  if (yearOnly) {
    return { preset: DEFAULT_PERIOD_PRESET, calendar: { year: Number(yearOnly[1]), month: null } };
  }

  const yearMonth = /^(\d{4})-(\d{2})$/.exec(raw);
  if (yearMonth) {
    const year = Number(yearMonth[1]);
    const month = Number(yearMonth[2]);

    if (month >= 1 && month <= 12) {
      return { preset: DEFAULT_PERIOD_PRESET, calendar: { year, month: month - 1 } };
    }
  }

  return { preset: DEFAULT_PERIOD_PRESET, calendar: null };
}

/**
 * Construit les paramètres d'URL correspondant à la sélection en cours.
 * Les autres paramètres de l'URL sont préservés (vue partageable).
 */
export function buildPeriodSearchParams(
  searchParams: URLSearchParams,
  preset: PeriodPreset,
  calendar: CalendarPeriod | null,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  if (calendar) {
    next.set(
      PERIOD_SEARCH_PARAM,
      calendar.month === null
        ? String(calendar.year)
        : `${calendar.year}-${String(calendar.month + 1).padStart(2, '0')}`,
    );
  } else {
    next.set(PERIOD_SEARCH_PARAM, preset);
  }

  return next;
}
