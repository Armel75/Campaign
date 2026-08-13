import cron from 'node-cron';
import { autoCloseExpiredCampaigns } from '../services/campaignAutoClose.service';

let isRunning = false;

async function runAutoCloseJob() {
  if (isRunning) {
    console.log('[CRON][AUTO_CLOSE] Job skipped because previous execution is still running');
    return;
  }

  isRunning = true;

  try {
    console.log('[CRON][AUTO_CLOSE] Campaign auto-close started at', new Date().toISOString());

    const result = await autoCloseExpiredCampaigns();

    console.log('[CRON][AUTO_CLOSE] Campaign auto-close finished', {
      updatedCount: result.updatedCount,
      campaigns: result.updatedCampaigns,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[CRON][AUTO_CLOSE] Campaign auto-close failed:', {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('[CRON][AUTO_CLOSE] Campaign auto-close failed with unknown error:', error);
    }
  } finally {
    isRunning = false;
  }
}

export function startCampaignAutoCloseCron() {
  console.log('[CRON][AUTO_CLOSE] Campaign auto-close cron initialized');

  void runAutoCloseJob();

  cron.schedule('* * * * *', async () => {
    await runAutoCloseJob();
  });
}