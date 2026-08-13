import prisma from '../infrastructure/prisma/client';
import { notifyCampaignUsers } from './notification.service';

export interface AutoActivatedCampaign {
  id: number;
  name: string;
  previousStatus: string;
  newStatus: string;
  startDate: Date;
}

export interface AutoActivateResult {
  updatedCount: number;
  updatedCampaigns: AutoActivatedCampaign[];
}

/**
 * Passe automatiquement les campagnes PLANIFIEE en ACTIVE dès que leur date de
 * début est atteinte (startDate <= maintenant).
 */
export async function autoActivatePlannedCampaigns(): Promise<AutoActivateResult> {
  const now = new Date();

  const campaignsToActivate = await prisma.campaign.findMany({
    where: {
      status: 'PLANIFIEE',
      startDate: {
        lte: now,
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
    },
  });

  if (campaignsToActivate.length === 0) {
    return {
      updatedCount: 0,
      updatedCampaigns: [],
    };
  }

  const updatedCampaigns: AutoActivatedCampaign[] = [];

  await prisma.$transaction(async (tx) => {
    for (const campaign of campaignsToActivate) {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'ACTIVE',
          updatedAt: now,
        },
      });

      updatedCampaigns.push({
        id: campaign.id,
        name: campaign.name,
        previousStatus: campaign.status,
        newStatus: 'ACTIVE',
        startDate: campaign.startDate,
      });
    }
  });

  // Notifier les utilisateurs pour chaque campagne auto-activée
  for (const campaign of updatedCampaigns) {
    await notifyCampaignUsers(
      'CAMPAIGN_AUTO_ACTIVATED',
      `Campagne activée : ${campaign.name}`,
      `La campagne "${campaign.name}" est passée au statut ACTIVE car sa date de début (${new Date(campaign.startDate).toLocaleDateString('fr-FR')}) est atteinte.`,
      `/campaigns/${campaign.id}`
    );
  }

  return {
    updatedCount: updatedCampaigns.length,
    updatedCampaigns,
  };
}
