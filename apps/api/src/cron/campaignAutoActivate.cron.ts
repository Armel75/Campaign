import cron from 'node-cron';
import { autoActivatePlannedCampaigns } from '../services/campaignAutoActivate.service';

let isRunning = false;

async function runAutoActivateJob() {
  if (isRunning) {
    console.log('[CRON][AUTO_ACTIVATE] Job skipped because previous execution is still running');
    return;
  }

  isRunning = true;

  try {
    console.log('[CRON][AUTO_ACTIVATE] Campaign auto-activate started at', new Date().toISOString());

    const result = await autoActivatePlannedCampaigns();

    console.log('[CRON][AUTO_ACTIVATE] Campaign auto-activate finished', {
      updatedCount: result.updatedCount,
      campaigns: result.updatedCampaigns,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[CRON][AUTO_ACTIVATE] Campaign auto-activate failed:', {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('[CRON][AUTO_ACTIVATE] Campaign auto-activate failed with unknown error:', error);
    }
  } finally {
    isRunning = false;
  }
}

export function startCampaignAutoActivateCron() {
  // Tous les jours à 00:05 (configurable via CAMPAIGN_AUTO_ACTIVATE_CRON)
  const schedule = process.env.CAMPAIGN_AUTO_ACTIVATE_CRON || '5 0 * * *';
  console.log('[CRON][AUTO_ACTIVATE] Cron quotidien d\'activation initialisé (', schedule, ')');

  void runAutoActivateJob();

  cron.schedule(schedule, async () => {
    await runAutoActivateJob();
  });
}
