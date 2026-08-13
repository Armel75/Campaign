import prisma from '../infrastructure/prisma/client';
import { sendEmail } from './email.service';

export type NotificationType =
  | 'CAMPAIGN_AUTO_CLOSED'
  | 'CAMPAIGN_ENDING_SOON'
  | 'CAMPAIGN_OVERDUE'
  | 'CAMPAIGN_AUTO_ACTIVATED';

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  sendEmail?: boolean;
  emailTo?: string;
  emailSubject?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
      },
    });

    // Envoi d'email si demandé
    if (input.sendEmail && input.emailTo) {
      await sendEmail({
        to: input.emailTo,
        subject: input.emailSubject || input.title,
        html: buildEmailHtml(input.title, input.message, input.link),
      });
    }
  } catch (error) {
    console.error('[NOTIFICATION] Erreur de création:', error);
  }
}

export async function notifyCampaignUsers(
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  options?: { excludeUserId?: number }
): Promise<void> {
  // Notifie tous les utilisateurs avec droit de voir les campagnes
  const users = await prisma.user.findMany({
    where: {
      ...(options?.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
      role: {
        canViewCampaigns: true,
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  for (const user of users) {
    await createNotification({
      userId: user.id,
      type,
      title,
      message,
      link,
      sendEmail: true,
      emailTo: user.email,
      emailSubject: title,
    });
  }
}

function buildEmailHtml(title: string, message: string, link?: string): string {
  const appUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
  const fullLink = link ? `${appUrl}${link}` : appUrl;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Campaign Manager</h1>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #1e293b;">${title}</h2>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">${message}</p>
        ${link ? `<a href="${fullLink}" style="display: inline-block; background: #1e40af; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">Voir les détails</a>` : ''}
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          Cet email est envoyé automatiquement par Campaign Manager.
        </p>
      </div>
    </div>
  `;
}
