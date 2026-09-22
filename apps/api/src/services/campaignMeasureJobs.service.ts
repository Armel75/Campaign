/**
 * Les deux mesures Sage X3 d'une campagne, déclarées une seule fois chacune et exécutées par le
 * même exécuteur de tâches de fond (`infrastructure/jobs/measureJobRunner`) : file d'attente à
 * 3 mesures simultanées, unicité par couple (type de mesure + campagne), résultats consultables
 * 15 min.
 *
 * Aucune de ces mesures ne reçoit de budget de temps : elles vont au bout de ce que permet la
 * source X3. C'est l'appelant qui décide s'il attend (fiche campagne) ou s'il borne son affichage
 * (tableau de bord).
 */

import {
  getMeasureJob,
  MeasureJob,
  startMeasureJob,
} from '../infrastructure/jobs/measureJobRunner';
import {
  CampaignX3ArticlesRevenue,
  getCampaignX3ArticlesRevenue,
} from './campaignSalesRevenue.service';
import {
  CampaignMonthlySales,
  getCampaignSalesLast3Months,
} from './campaignExport.service';

/** Types de mesure : servent de clé d'unicité (un seul job par type et par campagne). */
const X3_REVENUE_JOB_KIND = 'x3-revenue';
const SALES_LAST_3_MONTHS_JOB_KIND = 'sales-last-3-months';

/** CA facturé des articles (Sage X3) + clients distincts d'une campagne. */
export function startX3RevenueMeasureJob(
  campaignId: number,
  options: { force?: boolean } = {},
): MeasureJob<CampaignX3ArticlesRevenue> {
  return startMeasureJob<CampaignX3ArticlesRevenue>(
    X3_REVENUE_JOB_KIND,
    campaignId,
    () => getCampaignX3ArticlesRevenue(campaignId, {}),
    options,
  );
}

export function getX3RevenueMeasureJob(
  campaignId: number,
): MeasureJob<CampaignX3ArticlesRevenue> | undefined {
  return getMeasureJob<CampaignX3ArticlesRevenue>(X3_REVENUE_JOB_KIND, campaignId);
}

/** Quantités vendues des 3 mois calendaires précédant le début de la campagne. */
export function startSalesLast3MonthsMeasureJob(
  campaignId: number,
  options: { force?: boolean } = {},
): MeasureJob<CampaignMonthlySales> {
  return startMeasureJob<CampaignMonthlySales>(
    SALES_LAST_3_MONTHS_JOB_KIND,
    campaignId,
    () => getCampaignSalesLast3Months(campaignId),
    options,
  );
}

export function getSalesLast3MonthsMeasureJob(
  campaignId: number,
): MeasureJob<CampaignMonthlySales> | undefined {
  return getMeasureJob<CampaignMonthlySales>(SALES_LAST_3_MONTHS_JOB_KIND, campaignId);
}
