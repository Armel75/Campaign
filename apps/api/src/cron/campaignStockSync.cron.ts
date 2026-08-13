import cron from 'node-cron';
import { syncAllActiveCampaignStocks } from '../services/campaignStockSync.service';

let isRunning = false;

export function startCampaignStockSyncCron() {
  console.log('[CRON] Campaign stock sync cron initialized');

  cron.schedule('* * * * *', async () => {
    if (isRunning) {
      console.log('[CRON] Sync skipped because a previous sync is still running');
      return;
    }

    isRunning = true;
    console.log('[CRON] Campaign stock sync started at', new Date().toISOString());

    try {
      const result = await syncAllActiveCampaignStocks();

      console.log('[CRON] Campaign stock sync finished', {
        totalCampaigns: result.totalCampaigns,
        successCount: result.successCount,
        failedCount: result.failedCount,
      });

      if (result.failedCount > 0) {
        console.error('[CRON] Some campaign syncs failed:', result.results);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('[CRON] Campaign stock sync failed:', {
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error('[CRON] Campaign stock sync failed with unknown error:', error);
      }
    } finally {
      isRunning = false;
    }
  });
}