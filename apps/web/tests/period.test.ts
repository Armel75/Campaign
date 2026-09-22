import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPeriodSearchParams,
  readPeriodFromUrl,
  resolvePeriod,
} from '../src/lib/period.ts';

/** 21 septembre 2026, 10h30 — heure locale (les bornes sont locales par conception). */
const NOW = new Date(2026, 8, 21, 10, 30, 0, 0);

const day = (date: Date | null) =>
  date === null
    ? null
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;

const endOfDayMarker = (date: Date | null) =>
  date === null
    ? null
    : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
        2,
        '0',
      )}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(
        3,
        '0',
      )}`;

describe('resolvePeriod — fenêtres glissantes', () => {
  test('7j : 7 jours en arrière, fin de journée incluse', () => {
    const period = resolvePeriod('7j', null, NOW);

    assert.equal(day(period.from), '2026-09-14');
    assert.equal(period.from?.getHours(), 0);
    assert.equal(day(period.to), '2026-09-21');
    assert.equal(endOfDayMarker(period.to), '23:59:59.999');
    assert.equal(period.isAllTime, false);
  });

  test('30j et 90j : décalage en mois calendaires', () => {
    assert.equal(day(resolvePeriod('30j', null, NOW).from), '2026-08-21');
    assert.equal(day(resolvePeriod('90j', null, NOW).from), '2026-06-21');
  });

  test('année : 1er janvier de l’année courante', () => {
    const period = resolvePeriod('annee', null, NOW);

    assert.equal(day(period.from), '2026-01-01');
    assert.match(period.label, /Année 2026/);
  });

  test('tout : aucune borne et marquage explicite', () => {
    const period = resolvePeriod('tout', null, NOW);

    assert.equal(period.from, null);
    assert.equal(period.to, null);
    assert.equal(period.isAllTime, true);
  });
});

describe('resolvePeriod — périodes calendaires', () => {
  test('mois bissextile : février 2024 va jusqu’au 29', () => {
    const period = resolvePeriod('annee', { year: 2024, month: 1 }, NOW);

    assert.equal(day(period.from), '2024-02-01');
    assert.equal(day(period.to), '2024-02-29');
    assert.equal(endOfDayMarker(period.to), '23:59:59.999');
    assert.equal(period.label, 'Février 2024');
  });

  test('année non bissextile : février 2025 va jusqu’au 28', () => {
    const period = resolvePeriod('annee', { year: 2025, month: 1 }, NOW);

    assert.equal(day(period.to), '2025-02-28');
  });

  test('décembre : dernier jour du mois correct', () => {
    const period = resolvePeriod('annee', { year: 2026, month: 11 }, NOW);

    assert.equal(day(period.from), '2026-12-01');
    assert.equal(day(period.to), '2026-12-31');
  });

  test('tous les mois : année calendaire complète', () => {
    const period = resolvePeriod('annee', { year: 2025, month: null }, NOW);

    assert.equal(day(period.from), '2025-01-01');
    assert.equal(day(period.to), '2025-12-31');
    assert.equal(period.label, '2025 · Vue annuelle');
    assert.equal(period.source, 'calendrier');
  });

  test('le calendrier prend le pas sur le preset', () => {
    const period = resolvePeriod('7j', { year: 2024, month: 0 }, NOW);

    assert.equal(period.preset, null);
    assert.equal(day(period.from), '2024-01-01');
  });
});

describe('readPeriodFromUrl', () => {
  test('aucun paramètre → période par défaut', () => {
    assert.deepEqual(readPeriodFromUrl(new URLSearchParams()), {
      preset: 'annee',
      calendar: null,
    });
  });

  test('preset valide → preset seul', () => {
    assert.deepEqual(readPeriodFromUrl(new URLSearchParams('periode=tout')), {
      preset: 'tout',
      calendar: null,
    });
  });

  test('AAAA → année calendaire complète', () => {
    assert.deepEqual(readPeriodFromUrl(new URLSearchParams('periode=2025')), {
      preset: 'annee',
      calendar: { year: 2025, month: null },
    });
  });

  test('AAAA-MM → mois calendaire (mois ramené à un index 0-11)', () => {
    assert.deepEqual(readPeriodFromUrl(new URLSearchParams('periode=2026-08')), {
      preset: 'annee',
      calendar: { year: 2026, month: 7 },
    });
  });

  test('valeur inconnue ou mois inexistant → retour aux valeurs par défaut', () => {
    const fallback = { preset: 'annee', calendar: null };

    assert.deepEqual(readPeriodFromUrl(new URLSearchParams('periode=n-importe-quoi')), fallback);
    assert.deepEqual(readPeriodFromUrl(new URLSearchParams('periode=2026-13')), fallback);
    assert.deepEqual(readPeriodFromUrl(new URLSearchParams('periode=2026-00')), fallback);
  });
});

describe('buildPeriodSearchParams', () => {
  test('preset → écrit le paramètre de période', () => {
    const params = buildPeriodSearchParams(new URLSearchParams(), '7j', null);

    assert.equal(params.get('periode'), '7j');
  });

  test('mois → format AAAA-MM (mois sur 2 chiffres)', () => {
    const params = buildPeriodSearchParams(new URLSearchParams(), 'annee', {
      year: 2026,
      month: 7,
    });

    assert.equal(params.get('periode'), '2026-08');
  });

  test('année complète → format AAAA et autres paramètres préservés', () => {
    const params = buildPeriodSearchParams(new URLSearchParams('onglet=roi'), 'annee', {
      year: 2025,
      month: null,
    });

    assert.equal(params.get('periode'), '2025');
    assert.equal(params.get('onglet'), 'roi');
  });

  test('aller-retour lecture → écriture stable', () => {
    const initial = new URLSearchParams('periode=2024-11');
    const { preset, calendar } = readPeriodFromUrl(initial);
    const rebuilt = buildPeriodSearchParams(initial, preset, calendar);

    assert.equal(rebuilt.get('periode'), '2024-11');
  });
});
