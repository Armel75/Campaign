/**
 * Classement des ventes par campagne (page « Ventes par campagne » + export Excel).
 *
 * Règles, identiques à celles affichées par l'interface :
 *  - quantité vendue = somme des `soldQuantity` des articles de la campagne ;
 *  - revenu = CA Sage X3 (`getCampaignSalesRevenue`) ; `null` si indisponible (échec X3) ;
 *  - tri décroissant par quantité, puis départage DÉTERMINISTE (revenu, nom, id) afin que
 *    le fichier exporté soit reproductible d'un export à l'autre ;
 *  - une campagne peut avoir un revenu indisponible : le total de revenus reste fidèle à
 *    l'écran (les échecs X3 y comptent 0) et `revenueUnavailableCount` permet de le signaler.
 *
 * Volontairement sans dépendance Prisma / ExcelJS : module pur, testable unitairement.
 */

export type SalesRankingCampaign = {
  id: number;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  articles: Array<{ soldQuantity?: number | null }>;
};

export type SalesRankingRow = {
  campaignId: number;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  soldQuantity: number;
  /** CA Sage X3 (FCFA). `null` si le calcul a échoué ou si la campagne n'a pas été retournée. */
  revenue: number | null;
  /** Vrai si le calcul X3 a échoué : le revenu est inconnu, ce n'est pas un 0 vérifié. */
  revenueUnavailable: boolean;
  /** Part de la meilleure quantité, en pourcentage arrondi (0-100). */
  shareOfBest: number;
  /** Rang 1-indexé dans le classement complet. */
  rank: number;
};

export type SalesRankingSummary = {
  /** Somme des quantités de toutes les campagnes classées. */
  totalSold: number;
  /** Somme des revenus disponibles (les revenus indisponibles comptent 0, comme à l'écran). */
  totalRevenue: number;
  /** Nombre de campagnes ayant vendu au moins un article. */
  campaignsWithSales: number;
  /** Nombre de campagnes classées. */
  totalCampaigns: number;
  /** Meilleure campagne, uniquement si elle a vendu au moins un article. */
  best: SalesRankingRow | null;
  /** Nombre de campagnes dont le CA X3 n'a pas pu être calculé. */
  revenueUnavailableCount: number;
};

function sumSoldQuantity(articles: Array<{ soldQuantity?: number | null }> | undefined): number {
  return (articles ?? []).reduce((sum, article) => {
    const value = article.soldQuantity ?? 0;
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Revenu utilisable pour le départage : un revenu indisponible est neutre (0). */
function sortableRevenue(row: SalesRankingRow): number {
  return row.revenue ?? 0;
}

/**
 * Construit le classement complet (toutes les campagnes fournies, y compris celles à 0 vente).
 *
 * @param revenueByCampaignId CA par campagne tel que renvoyé par l'API (`data`)
 * @param revenueErrors Campagnes pour lesquelles le calcul X3 a échoué (`errors`)
 */
export function buildSalesRanking(
  campaigns: SalesRankingCampaign[],
  revenueByCampaignId: Record<number, number>,
  revenueErrors: Record<number, boolean> = {},
): SalesRankingRow[] {
  const rows: SalesRankingRow[] = campaigns.map((campaign) => {
    const revenueUnavailable = revenueErrors[campaign.id] === true;

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      soldQuantity: sumSoldQuantity(campaign.articles),
      revenue: revenueUnavailable ? null : toFiniteNumber(revenueByCampaignId[campaign.id]),
      revenueUnavailable,
      shareOfBest: 0,
      rank: 0,
    };
  });

  rows.sort(
    (a, b) =>
      b.soldQuantity - a.soldQuantity ||
      sortableRevenue(b) - sortableRevenue(a) ||
      a.name.localeCompare(b.name, 'fr') ||
      a.campaignId - b.campaignId,
  );

  const bestSold = rows.length > 0 ? rows[0].soldQuantity : 0;

  rows.forEach((row, index) => {
    row.rank = index + 1;
    row.shareOfBest = bestSold > 0 ? Math.round((row.soldQuantity / bestSold) * 100) : 0;
  });

  return rows;
}

/** Synthèse affichée en tête de l'export (les 4 carreaux de la page). */
export function buildSalesRankingSummary(rows: SalesRankingRow[]): SalesRankingSummary {
  const totalSold = rows.reduce((sum, row) => sum + row.soldQuantity, 0);

  const totalRevenue = rows.reduce(
    (sum, row) => sum + (row.revenue !== null ? row.revenue : 0),
    0,
  );

  const best = rows.length > 0 && rows[0].soldQuantity > 0 ? rows[0] : null;

  return {
    totalSold,
    totalRevenue,
    campaignsWithSales: rows.filter((row) => row.soldQuantity > 0).length,
    totalCampaigns: rows.length,
    best,
    revenueUnavailableCount: rows.filter((row) => row.revenueUnavailable).length,
  };
}
