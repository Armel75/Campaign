import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { isRevenueEstablished, resolveRoi } from '../src/services/roiStatus.ts';

/** Comparaison tolérante : on ne veut pas dépendre des arrondis flottants de IEEE-754. */
const assertClose = (actual: number | null, expected: number) => {
  assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, `attendu ≈ ${expected}, reçu ${actual}`);
};

describe('resolveRoi', () => {
  test('coût et revenu nuls → situation neutre avérée (0 %)', () => {
    assert.deepEqual(resolveRoi(0, 0), {
      roiStatus: 'ZERO_COST_ZERO_REVENUE',
      roiPercent: 0,
    });
  });

  test('coût nul avec du revenu → non calculable (division impossible)', () => {
    assert.deepEqual(resolveRoi(0, 5000), {
      roiStatus: 'NON_CALCULABLE_ZERO_COST',
      roiPercent: null,
    });
  });

  test('budget engagé sans aucune vente → revenu non établi, PAS de faux −100 %', () => {
    assert.deepEqual(resolveRoi(13709153, 0), {
      roiStatus: 'NO_ESTABLISHED_REVENUE',
      roiPercent: null,
    });
  });

  test('revenu supérieur au coût → ROI positif calculé', () => {
    const result = resolveRoi(10000, 15000);

    assert.equal(result.roiStatus, 'CALCULATED');
    assertClose(result.roiPercent, 50);
  });

  test('revenu inférieur au coût → ROI négatif conservé (vraie perte)', () => {
    const result = resolveRoi(10000, 4000);

    assert.equal(result.roiStatus, 'CALCULATED');
    assertClose(result.roiPercent, -60);
  });

  test('valeurs non finies traitées comme nulles (robustesse)', () => {
    assert.deepEqual(resolveRoi(Number.NaN, Number.NaN), {
      roiStatus: 'ZERO_COST_ZERO_REVENUE',
      roiPercent: 0,
    });
  });
});

describe('isRevenueEstablished', () => {
  test('seul NO_ESTABLISHED_REVENUE interdit l’affichage du profit', () => {
    assert.equal(isRevenueEstablished('NO_ESTABLISHED_REVENUE'), false);
    assert.equal(isRevenueEstablished('CALCULATED'), true);
    assert.equal(isRevenueEstablished('ZERO_COST_ZERO_REVENUE'), true);
    assert.equal(isRevenueEstablished('NON_CALCULABLE_ZERO_COST'), true);
  });
});
