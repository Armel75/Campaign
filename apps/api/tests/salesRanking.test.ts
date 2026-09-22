import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSalesRanking,
  buildSalesRankingSummary,
} from '../src/services/salesRanking.ts';
// `import type` obligatoire : Node exécute ces tests en TypeScript natif en effaçant les types.
import type { SalesRankingCampaign } from '../src/services/salesRanking.ts';

function campaign(
  id: number,
  name: string,
  soldQuantities: Array<number | null>,
  overrides: Partial<SalesRankingCampaign> = {},
): SalesRankingCampaign {
  return {
    id,
    name,
    status: 'ACTIVE',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-02-01T00:00:00.000Z'),
    articles: soldQuantities.map((soldQuantity) => ({ soldQuantity })),
    ...overrides,
  };
}

describe('buildSalesRanking', () => {
  test('somme les articles et trie par quantité décroissante', () => {
    const rows = buildSalesRanking(
      [campaign(1, 'Alpha', [10, 5]), campaign(2, 'Beta', [30])],
      { 1: 1000, 2: 2000 },
    );

    assert.deepEqual(
      rows.map((row) => [row.rank, row.name, row.soldQuantity]),
      [
        [1, 'Beta', 30],
        [2, 'Alpha', 15],
      ],
    );
  });

  test('départage déterministe : quantité, puis revenu, puis nom', () => {
    const rows = buildSalesRanking(
      [
        campaign(1, 'Zeta', [10]),
        campaign(2, 'Alpha', [10]),
        campaign(3, 'Beta', [10]),
      ],
      { 1: 500, 2: 500, 3: 900 },
    );

    assert.deepEqual(
      rows.map((row) => row.name),
      ['Beta', 'Alpha', 'Zeta'],
    );
  });

  test('un échec X3 donne un revenu indisponible, jamais un faux 0 vérifié', () => {
    const rows = buildSalesRanking([campaign(1, 'Alpha', [10])], { 1: 0 }, { 1: true });

    assert.equal(rows[0].revenue, null);
    assert.equal(rows[0].revenueUnavailable, true);
  });

  test('part du meilleur : relative à la tête, 0 quand aucune vente', () => {
    const rows = buildSalesRanking(
      [campaign(1, 'Alpha', [80]), campaign(2, 'Beta', [40])],
      {},
    );

    assert.deepEqual(
      rows.map((row) => row.shareOfBest),
      [100, 50],
    );

    const empty = buildSalesRanking([campaign(1, 'Alpha', [0, null])], {});
    assert.equal(empty[0].shareOfBest, 0);
  });

  test('quantités absentes ou non finies traitées comme nulles', () => {
    const rows = buildSalesRanking(
      [campaign(1, 'Alpha', [undefined as unknown as number, null, 7])],
      {},
    );

    assert.equal(rows[0].soldQuantity, 7);
  });
});

describe('buildSalesRankingSummary', () => {
  test('totaux, campagnes ayant vendu et meilleure campagne', () => {
    const rows = buildSalesRanking(
      [campaign(1, 'Alpha', [10]), campaign(2, 'Beta', [0]), campaign(3, 'Gamma', [25])],
      { 1: 1000, 2: 0, 3: 3000 },
    );

    const summary = buildSalesRankingSummary(rows);

    assert.equal(summary.totalSold, 35);
    assert.equal(summary.totalRevenue, 4000);
    assert.equal(summary.campaignsWithSales, 2);
    assert.equal(summary.totalCampaigns, 3);
    assert.equal(summary.best?.name, 'Gamma');
    assert.equal(summary.revenueUnavailableCount, 0);
  });

  test('un revenu indisponible compte 0 dans le total (fidèle à l’écran mais signalé)', () => {
    const rows = buildSalesRanking(
      [campaign(1, 'Alpha', [10]), campaign(2, 'Beta', [5])],
      { 1: 1000, 2: 0 },
      { 2: true },
    );

    const summary = buildSalesRankingSummary(rows);

    assert.equal(summary.totalRevenue, 1000);
    assert.equal(summary.revenueUnavailableCount, 1);
  });

  test('aucune vente : pas de meilleure campagne', () => {
    const rows = buildSalesRanking([campaign(1, 'Alpha', [0])], {});
    const summary = buildSalesRankingSummary(rows);

    assert.equal(summary.best, null);
    assert.equal(summary.campaignsWithSales, 0);
    assert.equal(summary.totalSold, 0);
  });
});
