import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMonthlyBuckets,
  parseTzOffsetMinutes,
} from '../src/infrastructure/utils/monthlyBuckets.ts';

describe('buildMonthlyBuckets', () => {
  test('regroupe par mois et trie chronologiquement', () => {
    const buckets = buildMonthlyBuckets([
      new Date('2026-09-02T10:00:00.000Z'),
      new Date('2026-08-15T10:00:00.000Z'),
      new Date('2026-09-20T10:00:00.000Z'),
    ]);

    assert.deepEqual(buckets, [
      { key: '2026-08', year: 2026, month: 8, count: 1 },
      { key: '2026-09', year: 2026, month: 9, count: 2 },
    ]);
  });

  test('mois sans donnée → absent (aucun remplissage implicite)', () => {
    const buckets = buildMonthlyBuckets([
      new Date('2026-01-05T00:00:00.000Z'),
      new Date('2026-03-05T00:00:00.000Z'),
    ]);

    assert.deepEqual(
      buckets.map((bucket) => bucket.key),
      ['2026-01', '2026-03'],
    );
  });

  test('valeurs nulles ou invalides → ignorées', () => {
    const buckets = buildMonthlyBuckets([
      null,
      undefined,
      new Date('date-invalide'),
      new Date('2026-07-01T00:00:00.000Z'),
    ]);

    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].count, 1);
  });

  test('décalage horaire appliqué : le mois local prime sur le mois UTC', () => {
    // 31/08/2026 23:30 UTC = 01/09/2026 00:30 en UTC+1
    const buckets = buildMonthlyBuckets([new Date('2026-08-31T23:30:00.000Z')], 60);

    assert.deepEqual(buckets, [{ key: '2026-09', year: 2026, month: 9, count: 1 }]);
  });

  test("décalage horaire : passage d'année correct", () => {
    // 31/12/2026 23:30 UTC = 01/01/2027 00:30 en UTC+1
    const buckets = buildMonthlyBuckets([new Date('2026-12-31T23:30:00.000Z')], 60);

    assert.deepEqual(buckets, [{ key: '2027-01', year: 2027, month: 1, count: 1 }]);
  });
});

describe('parseTzOffsetMinutes', () => {
  test('absent ou invalide → 0 (UTC)', () => {
    assert.equal(parseTzOffsetMinutes(undefined), 0);
    assert.equal(parseTzOffsetMinutes('abc'), 0);
  });

  test('hors plage → 0', () => {
    assert.equal(parseTzOffsetMinutes('5000'), 0);
  });

  test('valeur négative acceptée et tronquée', () => {
    assert.equal(parseTzOffsetMinutes('-300'), -300);
    assert.equal(parseTzOffsetMinutes('60.9'), 60);
  });
});
