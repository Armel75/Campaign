import cron from 'node-cron';
import { generateWeeklySalesReport } from '../services/weeklySalesReport.service';
import { sendEmail } from '../services/email.service';

let isRunning = false;

function getRecipients(): string[] {
  const raw = process.env.WEEKLY_REPORT_RECIPIENTS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatPct(value: number | null): string {
  return value === null ? 'N/A' : `${value} %`;
}

function buildReportHtml(summary: Awaited<ReturnType<typeof generateWeeklySalesReport>>['summary']): string {
  const appUrl = process.env.WEB_ORIGIN;

  const rowsHtml = summary.rows
    .map((r) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px;">
          <a href="${appUrl}/campagne/campaigns/${r.id}" style="color: #1e40af; text-decoration: none; font-weight: 600;">${r.name}</a>
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px;">${r.status}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right;">${r.plannedQuantity.toLocaleString('fr-FR')}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 600;">${r.soldQuantity.toLocaleString('fr-FR')}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: ${r.attainmentPct !== null && r.attainmentPct >= 75 ? '#16a34a' : '#dc2626'};">${formatPct(r.attainmentPct)}</td>
      </tr>
    `)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">📊 Rapport hebdomadaire des ventes</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Généré le ${summary.generatedAt.toLocaleString('fr-FR')}</p>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
          Voici l'état des ventes des <strong>${summary.totalCampaigns}</strong> campagne(s) (actives + terminées sur les 7 derniers jours).
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="background: #f1f5f9; padding: 12px; text-align: center; border-radius: 6px;">
              <div style="font-size: 12px; color: #64748b;">Qté prévue totale</div>
              <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${summary.totalPlanned.toLocaleString('fr-FR')}</div>
            </td>
            <td style="width: 12px;"></td>
            <td style="background: #f1f5f9; padding: 12px; text-align: center; border-radius: 6px;">
              <div style="font-size: 12px; color: #64748b;">Qté vendue totale</div>
              <div style="font-size: 20px; font-weight: 700; color: #16a34a;">${summary.totalSold.toLocaleString('fr-FR')}</div>
            </td>
            <td style="width: 12px;"></td>
            <td style="background: #f1f5f9; padding: 12px; text-align: center; border-radius: 6px;">
              <div style="font-size: 12px; color: #64748b;">Réalisation globale</div>
              <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${formatPct(summary.overallAttainmentPct)}</div>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="background: #1e40af; color: white; padding: 8px; text-align: left; font-size: 12px;">Campagne</th>
              <th style="background: #1e40af; color: white; padding: 8px; text-align: left; font-size: 12px;">Statut</th>
              <th style="background: #1e40af; color: white; padding: 8px; text-align: right; font-size: 12px;">Qté prévue</th>
              <th style="background: #1e40af; color: white; padding: 8px; text-align: right; font-size: 12px;">Qté vendue</th>
              <th style="background: #1e40af; color: white; padding: 8px; text-align: right; font-size: 12px;">Réalisation</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="padding: 12px; font-size: 13px; color: #94a3b8; text-align: center;">Aucune campagne dans le périmètre.</td></tr>'}
          </tbody>
        </table>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          Le détail complet est disponible en pièce jointe (fichier Excel .xlsx).
        </p>
      </div>
    </div>
  `;
}

export async function runWeeklySalesReportJob() {
  if (isRunning) {
    console.log('[CRON][WEEKLY_REPORT] Job skipped because previous execution is still running');
    return;
  }

  const recipients = getRecipients();
  if (recipients.length === 0) {
    console.warn('[CRON][WEEKLY_REPORT] Aucun destinataire configuré (WEEKLY_REPORT_RECIPIENTS). Job ignoré.');
    return;
  }

  isRunning = true;

  try {
    console.log('[CRON][WEEKLY_REPORT] Rapport hebdomadaire démarré à', new Date().toISOString());

    const report = await generateWeeklySalesReport();

    const html = buildReportHtml(report.summary);

    // Un email PAR destinataire (champ To = sa propre adresse), pour éviter
    // que le mail semble aller de support@ à support@ (comme avec un BCC self-To).
    for (const recipient of recipients) {
      await sendEmail({
        to: recipient,
        subject: `📊 Rapport hebdomadaire des ventes des campagnes — ${report.summary.generatedAt.toLocaleDateString('fr-FR')}`,
        html,
        attachments: [
          {
            filename: report.fileName,
            content: report.buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      });
    }

    console.log('[CRON][WEEKLY_REPORT] Rapport envoyé à', recipients.join(', '), {
      fileName: report.fileName,
      totalCampaigns: report.summary.totalCampaigns,
      totalSold: report.summary.totalSold,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[CRON][WEEKLY_REPORT] Échec du rapport hebdomadaire:', {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('[CRON][WEEKLY_REPORT] Échec du rapport hebdomadaire avec erreur inconnue:', error);
    }
  } finally {
    isRunning = false;
  }
}

export function startWeeklySalesReportCron() {
  const schedule = process.env.WEEKLY_REPORT_CRON;
  if (!schedule) {
    console.warn(
      '[CRON][WEEKLY_REPORT] WEEKLY_REPORT_CRON non défini dans l\'environnement. Cron non programmé.',
    );
    return;
  }
  console.log('[CRON][WEEKLY_REPORT] Cron hebdomadaire initialisé (', schedule, ')');

  cron.schedule(schedule, async () => {
    await runWeeklySalesReportJob();
  });
}
