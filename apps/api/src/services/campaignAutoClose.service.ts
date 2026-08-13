import prisma from '../infrastructure/prisma/client';
import { notifyCampaignUsers } from './notification.service';

export interface AutoClosedArticle {
  id: number;
  designation: string;
  previousCurrentQuantity: number | null;
  newQuantityAtClosure: number | null;
}

export interface AutoClosedCampaign {
  id: number;
  name: string;
  previousStatus: string;
  newStatus: string;
  endDate: Date;
  articlesUpdatedCount: number;
  articles: AutoClosedArticle[];
}

export interface AutoCloseResult {
  updatedCount: number;
  updatedCampaigns: AutoClosedCampaign[];
}

export async function autoCloseExpiredCampaigns(): Promise<AutoCloseResult> {
  const now = new Date();

  const campaignsToClose = await prisma.campaign.findMany({
    where: {
      endDate: {
        lte: now,
      },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      status: true,
      endDate: true,
      articles: {
        select: {
          id: true,
          designation: true,
          currentQuantity: true,
        },
      },
    },
  });

  if (campaignsToClose.length === 0) {
    return {
      updatedCount: 0,
      updatedCampaigns: [],
    };
  }

  const updatedCampaigns: AutoClosedCampaign[] = [];

  await prisma.$transaction(async (tx) => {
    for (const campaign of campaignsToClose) {
      const updatedArticles: AutoClosedArticle[] = [];

      for (const article of campaign.articles) {
        const closureQuantity = article.currentQuantity ?? null;

        await tx.article.update({
          where: {
            id: article.id,
          },
          data: {
            quantityAtClosure: closureQuantity,
            updatedAt: now,
          },
        });

        updatedArticles.push({
          id: article.id,
          designation: article.designation,
          previousCurrentQuantity: article.currentQuantity ?? null,
          newQuantityAtClosure: closureQuantity,
        });
      }

      await tx.campaign.update({
        where: {
          id: campaign.id,
        },
        data: {
          status: 'TERMINEE',
          updatedAt: now,
        },
      });

      updatedCampaigns.push({
        id: campaign.id,
        name: campaign.name,
        previousStatus: campaign.status,
        newStatus: 'TERMINEE',
        endDate: campaign.endDate,
        articlesUpdatedCount: updatedArticles.length,
        articles: updatedArticles,
      });
    }
  });

  // Notifier les utilisateurs pour chaque campagne auto-clôturée
  for (const campaign of updatedCampaigns) {
    const articleCount = campaign.articlesUpdatedCount;
    await notifyCampaignUsers(
      'CAMPAIGN_AUTO_CLOSED',
      `Campagne terminée : ${campaign.name}`,
      `La campagne "${campaign.name}" a été automatiquement clôturée. ${articleCount} article${articleCount > 1 ? 's' : ''} mis à jour avec la quantité de clôture.`,
      `/campaigns/${campaign.id}`
    );
  }

  return {
    updatedCount: updatedCampaigns.length,
    updatedCampaigns,
  };
}