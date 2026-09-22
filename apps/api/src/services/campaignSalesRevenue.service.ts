/**
 * Montant total des ventes (CA Sage X3) par campagne.
 *
 * Logique extraite telle quelle de la route `POST /campaigns/sales-summary` afin qu'elle
 * serve de source unique à l'affichage (page « Ventes par campagne ») ET à l'export Excel :
 * une seule implémentation, donc aucune divergence possible entre l'écran et le fichier.
 *
 * Le calcul est fait en série (une requête X3 par campagne) pour ne pas saturer le pool
 * Sage X3 (10 connexions max) ; le résultat est mémorisé quelques minutes afin que l'export
 * déclenché juste après l'affichage de la page ne relance pas une passe X3 complète.
 */

import prisma from '../infrastructure/prisma/client';
import { DASHBOARD_CACHE_TTL_MS, TtlCache } from '../infrastructure/cache/ttlCache';
import {
  ArticleCodeRef,
  getDistinctClientCountByArticle,
  getSalesAmountByArticle,
} from './x3Sales.service';

/**
 * Périmètre d'articles mesurable d'une campagne (diagnostic du proxy « CA X3 »).
 * « Mesurable » = article porteur d'au moins un code Sage exploitable dans X3.
 */
export type CampaignArticlesPerimeter = {
  /** Nombre total d'articles rattachés à la campagne. */
  articlesCount: number;
  /** Articles porteurs d'un code Sage (donc réellement interrogeables dans X3). */
  articlesMesurables: number;
};

export type CampaignSalesRevenueResult = {
  /** CA (FCFA) par identifiant de campagne. Toujours renseigné pour une campagne existante. */
  data: Record<number, number>;
  /** Campagnes dont le calcul X3 a échoué (le CA vaut alors 0 dans `data`). */
  errors: Record<number, boolean>;
  /**
   * Périmètre d'articles par campagne. Permet à l'appelant d'afficher « N/M article(s) »
   * à côté du montant : un CA sans périmètre est un chiffre invérifiable pour le lecteur.
   */
  perimeter: Record<number, CampaignArticlesPerimeter>;
  /**
   * Clients distincts (Sage X3) par campagne. Mesure SÉPARÉE du CA :
   * `null` = non mesuré (mesure non demandée, X3 en échec, plafond de temps atteint,
   * campagne sans période ou sans article codifié) — et jamais 0, qui laisserait croire
   * à une absence d'acheteur alors qu'on n'a rien mesuré.
   */
  clients: Record<number, number | null>;
};

export type CampaignSalesRevenueOptions = {
  /**
   * Budget maximal (ms) accordé à la passe X3. Au-delà, les campagnes restantes sont
   * marquées « CA indisponible » sans être calculées.
   *
   * Pourquoi : une requête X3 peut coûter jusqu'à `requestTimeout` (60 s) et le calcul
   * enchaîne une requête par campagne. Sans plafond, un export peut « tourner » plusieurs
   * minutes. Les valeurs déjà en cache restent utilisées, même après le budget.
   */
  budgetMs?: number;
  /**
   * Demande aussi le nombre de clients distincts (Sage X3) par campagne.
   *
   * Désactivé par défaut À DESSEIN : chaque campagne coûte alors une requête X3
   * supplémentaire (balayage de la vue sur la fenêtre de la campagne). Le classement des
   * ventes et l'export Excel n'en ont pas besoin — les activer doublerait inutilement le
   * temps de l'export, précisément ce qu'on a cherché à réduire.
   */
  includeDistinctClients?: boolean;
};

/**
 * Cache PAR CAMPAGNE (et non par liste d'identifiants) : la page et l'export demandent
 * les mêmes campagnes dans des ordres différents et avec des périmètres qui peuvent
 * varier légèrement. Une clé basée sur la liste d'identifiants ne serait donc jamais
 * réutilisée et relancerait systématiquement toute la passe X3 (export lent).
 */
const campaignRevenueCache = new TtlCache(DASHBOARD_CACHE_TTL_MS);

/**
 * Cache des clients distincts, SÉPARÉ de celui du CA (clé et type distincts) : un échec ou
 * une absence de la mesure « clients » ne doit jamais invalider ni écraser un CA déjà
 * calculé, et inversement.
 */
const campaignClientsCache = new TtlCache(DASHBOARD_CACHE_TTL_MS);

function campaignRevenueCacheKey(campaignId: number): string {
  return `sales-revenue:campaign:${campaignId}`;
}

function campaignClientsCacheKey(campaignId: number): string {
  return `sales-clients:campaign:${campaignId}`;
}

export async function getCampaignSalesRevenue(
  campaignIds: number[],
  options: CampaignSalesRevenueOptions = {},
): Promise<CampaignSalesRevenueResult> {
  const uniqueIds = [...new Set(campaignIds)].filter(
    (id) => Number.isInteger(id) && id > 0,
  );

  if (uniqueIds.length === 0) {
    return { data: {}, errors: {}, perimeter: {}, clients: {} };
  }

  const deadline = options.budgetMs === undefined ? null : Date.now() + options.budgetMs;

  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      articles: {
        select: { id: true, codeSageX3: true, codeSage100: true },
      },
    },
  });

  const data: Record<number, number> = {};
  const errors: Record<number, boolean> = {};
  const perimeter: Record<number, CampaignArticlesPerimeter> = {};
  const clients: Record<number, number | null> = {};
  const includeClients = options.includeDistinctClients === true;
  let skippedCount = 0;

  /**
   * Clients distincts d'une campagne : cache dédié → budget partagé → mesure X3.
   * `null` (= « non mesuré ») dès qu'on ne peut pas conclure : jamais 0 par défaut.
   */
  const resolveDistinctClients = async (
    campaignId: number,
    articleRefs: ArticleCodeRef[],
    startDate: Date,
    endDate: Date,
  ): Promise<number | null> => {
    const clientsCacheKey = campaignClientsCacheKey(campaignId);
    const cachedClients = campaignClientsCache.get<number>(clientsCacheKey);
    if (cachedClients !== undefined) return cachedClients;

    // Budget épuisé : on n'ouvre pas une requête X3 de plus.
    if (deadline !== null && Date.now() > deadline) return null;

    try {
      const count = await getDistinctClientCountByArticle(articleRefs, startDate, endDate);
      campaignClientsCache.set(clientsCacheKey, count);
      return count;
    } catch (error) {
      console.error(`Erreur X3 (clients distincts) pour la campagne ${campaignId}:`, error);
      return null;
    }
  };

  // Traitement séquentiel pour éviter la saturation du pool X3
  for (const campaign of campaigns) {
    const articleRefs: ArticleCodeRef[] = campaign.articles
      .filter((article) => article.codeSage100 || article.codeSageX3)
      .map((article) => ({
        articleId: article.id,
        codeSage100: article.codeSage100,
        codeSageX3: article.codeSageX3,
      }));

    // Renseigné AVANT les sorties anticipées : le périmètre reste connu même quand
    // aucun calcul n'est possible (campagne sans période, aucun article codifié).
    perimeter[campaign.id] = {
      articlesCount: campaign.articles.length,
      articlesMesurables: articleRefs.length,
    };

    if (!campaign.startDate || !campaign.endDate) {
      data[campaign.id] = 0;
      if (includeClients) clients[campaign.id] = null;
      continue;
    }

    if (articleRefs.length === 0) {
      data[campaign.id] = 0;
      if (includeClients) clients[campaign.id] = null;
      continue;
    }

    const effectiveEndDate = campaign.endDate > new Date() ? new Date() : campaign.endDate;

    // Valeur déjà calculée (le plus souvent par l'affichage, quelques secondes avant
    // l'export) : on ne relance pas une requête X3 pour la même campagne.
    const cacheKey = campaignRevenueCacheKey(campaign.id);
    const cachedRevenue = campaignRevenueCache.get<number>(cacheKey);

    if (cachedRevenue !== undefined) {
      data[campaign.id] = cachedRevenue;
    } else if (deadline !== null && Date.now() > deadline) {
      // Budget épuisé : on n'attend pas la fin de la passe X3 (les campagnes restantes
      // ressortent en « N/A » chez l'appelant).
      data[campaign.id] = 0;
      errors[campaign.id] = true;
      skippedCount += 1;
    } else {
      try {
        const salesAmounts = await getSalesAmountByArticle(
          articleRefs,
          campaign.startDate,
          effectiveEndDate,
        );

        const total = Object.values(salesAmounts).reduce((sum, value) => sum + value, 0);

        data[campaign.id] = total;
        campaignRevenueCache.set(cacheKey, total);
      } catch (error) {
        console.error(`Erreur X3 pour la campagne ${campaign.id}:`, error);
        data[campaign.id] = 0;
        errors[campaign.id] = true;
      }
    }

    // Mesure indépendante (cache et échec propres). Tentée même quand le CA venait du
    // cache : sinon les clients ne se rempliraient jamais sur un affichage réchauffé.
    if (includeClients) {
      clients[campaign.id] = await resolveDistinctClients(
        campaign.id,
        articleRefs,
        campaign.startDate,
        effectiveEndDate,
      );
    }
  }

  if (skippedCount > 0) {
    console.warn(
      `Calcul du CA X3 interrompu (budget ${options.budgetMs} ms dépassé) : ` +
        `${skippedCount} campagne(s) sur ${campaigns.length} non calculée(s).`,
    );
  }

  // Seules les valeurs calculées avec succès sont mises en cache (voir la boucle
  // ci-dessus) : une campagne en échec X3 n'est jamais figée pour tout le TTL.
  return { data, errors, perimeter, clients };
}

/**
 * CA facturé Sage X3 des articles d'une campagne + diagnostic du périmètre.
 *
 * Indicateur SÉPARÉ du revenu du ROI : c'est une corrélation de périmètre (tous clients,
 * tous vendeurs, aucun lien facture → campagne), pas une attribution à la campagne.
 * `caArticles = null` signifie « non mesuré » (X3 indisponible, budget dépassé, ou aucun
 * article identifiable) — et jamais 0, qui serait un mensonge.
 */
export type CampaignX3ArticlesRevenue = {
  caArticles: number | null;
  /**
   * Clients distincts ayant acheté au moins un article de la campagne sur sa fenêtre
   * (Sage X3, tous vendeurs). Corrélation de périmètre, comme le CA : `null` = non mesuré.
   */
  distinctClients: number | null;
  articlesCount: number;
  articlesMesurables: number;
  articlesNonMesures: number;
  /** Codes Sage partagés par ≥ 2 articles de la campagne → CA possiblement compté plusieurs fois. */
  codeDoublons: number;
  computedAt: string;
};

export async function getCampaignX3ArticlesRevenue(
  campaignId: number,
  options: CampaignSalesRevenueOptions = {},
): Promise<CampaignX3ArticlesRevenue> {
  const articles = await prisma.article.findMany({
    where: { campaignId },
    select: { id: true, codeSageX3: true, codeSage100: true },
  });

  const normalize = (value?: string | null) => String(value ?? '').trim().toUpperCase();
  const occurrences = new Map<string, number>();
  let articlesMesurables = 0;

  for (const article of articles) {
    const codes = [normalize(article.codeSageX3), normalize(article.codeSage100)].filter(Boolean);
    if (codes.length === 0) continue;

    articlesMesurables += 1;

    for (const code of new Set(codes)) {
      occurrences.set(code, (occurrences.get(code) ?? 0) + 1);
    }
  }

  const codeDoublons = [...occurrences.values()].filter((count) => count > 1).length;

  const { data, errors, clients } = await getCampaignSalesRevenue([campaignId], {
    ...options,
    includeDistinctClients: true,
  });
  const unavailable = errors[campaignId] === true;
  const value = data[campaignId];
  // Un périmètre sans article codifié ne permet aucune mesure : ni CA, ni clients.
  // (Les deux valent alors `null`, jamais 0.)
  const notMeasurable = articlesMesurables === 0;

  return {
    caArticles: unavailable || notMeasurable || value === undefined ? null : value,
    distinctClients: notMeasurable ? null : clients[campaignId] ?? null,
    articlesCount: articles.length,
    articlesMesurables,
    articlesNonMesures: articles.length - articlesMesurables,
    codeDoublons,
    computedAt: new Date().toISOString(),
  };
}
