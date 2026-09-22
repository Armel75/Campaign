/**
 * Statut et pourcentage de ROI — SOURCE UNIQUE pour le dashboard, la page détails,
 * le pilotage stratégique et les exports.
 *
 * Principe : un ROI n'est affiché que s'il est **significatif**.
 *
 *  - `ZERO_COST_ZERO_REVENUE`   : coût et revenu nuls → 0 % (situation neutre avérée)
 *  - `NON_CALCULABLE_ZERO_COST` : coût nul avec du revenu → non calculable (division impossible)
 *  - `NO_ESTABLISHED_REVENUE`   : coût > 0 mais **aucune vente confirmée** → revenu non établi.
 *    Afficher « −100 % » laisserait croire à une perte totale du budget alors qu'aucun
 *    revenu n'est simplement enregistré. Le profit est masqué dans ce cas (règle produit).
 *  - `CALCULATED`               : (revenu − coût) / coût × 100
 *
 * ⚠️ Aucune règle de coût ni de revenu n'est définie ici : cette fonction ne fait que
 * qualifier des montants déjà calculés (coût = `Campaign.totalBudget`,
 * revenu = conversions CONFIRMED de type SALE).
 */

export type CampaignRoiStatus =
  | 'CALCULATED'
  | 'ZERO_COST_ZERO_REVENUE'
  | 'NON_CALCULABLE_ZERO_COST'
  | 'NO_ESTABLISHED_REVENUE';

export type ResolvedRoi = {
  roiStatus: CampaignRoiStatus;
  /** `null` quand le ROI ne doit pas être affiché. */
  roiPercent: number | null;
};

/** Statuts pour lesquels un ROI s'affiche comme « non calculable » côté UI. */
export const NON_CALCULABLE_ROI_STATUSES: CampaignRoiStatus[] = [
  'NON_CALCULABLE_ZERO_COST',
  'NO_ESTABLISHED_REVENUE',
];

export function resolveRoi(cost: number, revenue: number): ResolvedRoi {
  const hasCost = Number.isFinite(cost) && cost > 0;
  const hasRevenue = Number.isFinite(revenue) && revenue > 0;

  if (!hasCost && !hasRevenue) {
    return { roiStatus: 'ZERO_COST_ZERO_REVENUE', roiPercent: 0 };
  }

  if (!hasCost) {
    return { roiStatus: 'NON_CALCULABLE_ZERO_COST', roiPercent: null };
  }

  if (!hasRevenue) {
    return { roiStatus: 'NO_ESTABLISHED_REVENUE', roiPercent: null };
  }

  return {
    roiStatus: 'CALCULATED',
    roiPercent: ((revenue - cost) / cost) * 100,
  };
}

/** Le revenu est-il établi (donc le profit affichable) ? */
export function isRevenueEstablished(roiStatus: CampaignRoiStatus): boolean {
  return roiStatus !== 'NO_ESTABLISHED_REVENUE';
}
