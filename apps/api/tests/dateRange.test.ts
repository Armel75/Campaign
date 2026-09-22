import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDateRange, toPrismaDateFilter } from '../src/infrastructure/utils/dateRange.ts';

describe('parseDateRange', () => {
  test('aucun paramètre → aucune borne (filtre désactivé)', () => {
    const range = parseDateRange({});

    assert.equal(range.error, undefined);
    assert.equal(range.gte, undefined);
    assert.equal(range.lte, undefined);
    assert.equal(toPrismaDateFilter(range), undefined);
  });

  test('paramètres vides → ignorés', () => {
    const range = parseDateRange({ from: '', to: '   ' });

    assert.equal(range.error, undefined);
    assert.equal(range.gte, undefined);
    assert.equal(range.lte, undefined);
  });

  test('AAAA-MM-JJ → bornes de journée inclusives (UTC)', () => {
    const range = parseDateRange({ from: '2026-08-01', to: '2026-08-31' });

    assert.equal(range.gte?.toISOString(), '2026-08-01T00:00:00.000Z');
    assert.equal(range.lte?.toISOString(), '2026-08-31T23:59:59.999Z');
  });

  test('instant ISO complet → respecté tel quel (fuseau utilisateur)', () => {
    const range = parseDateRange({ from: '2026-08-31T23:00:00.000Z' });

    assert.equal(range.gte?.toISOString(), '2026-08-31T23:00:00.000Z');
  });

  test('plage inversée → erreur explicite', () => {
    const range = parseDateRange({ from: '2026-09-30', to: '2026-09-01' });

    assert.match(range.error ?? '', /Période invalide/);
  });

  test('date invalide → erreur explicite (et non une exception)', () => {
    const range = parseDateRange({ from: 'pas-une-date' });

    assert.match(range.error ?? '', /invalide/);
  });

  test('noms de paramètres personnalisés (dueFrom / dueTo)', () => {
    const range = parseDateRange(
      { dueFrom: '2026-01-01', dueTo: '2026-01-31' },
      'dueFrom',
      'dueTo',
    );

    assert.equal(range.error, undefined);
    assert.equal(range.gte?.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(range.lte?.toISOString(), '2026-01-31T23:59:59.999Z');
  });
});

describe('toPrismaDateFilter', () => {
  test('borne basse seule → gte uniquement', () => {
    const filter = toPrismaDateFilter(parseDateRange({ from: '2026-05-01' }));

    assert.deepEqual(Object.keys(filter ?? {}), ['gte']);
  });

  test('borne haute seule → lte uniquement', () => {
    const filter = toPrismaDateFilter(parseDateRange({ to: '2026-05-31' }));

    assert.deepEqual(Object.keys(filter ?? {}), ['lte']);
  });

  test('les deux bornes → gte + lte', () => {
    const filter = toPrismaDateFilter(parseDateRange({ from: '2026-05-01', to: '2026-05-31' }));

    assert.deepEqual(Object.keys(filter ?? {}).sort(), ['gte', 'lte']);
  });
});
