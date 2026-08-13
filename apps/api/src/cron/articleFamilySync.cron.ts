import cron from "node-cron";
import { ArticleFamilySyncService } from "../services/articleFamilySync.service";

let isRunning = false;

export function startArticleFamilySyncCron() {
  console.log("[CRON] Article family sync cron initialized");

  // Tous les jours à 09h00 et 18h00
  cron.schedule("0 9,18 * * *", async () => {
    if (isRunning) {
      console.log(
        "[CRON] Article family sync skipped because previous sync is still running"
      );
      return;
    }

    isRunning = true;
    console.log(
      "[CRON] Article family sync started at",
      new Date().toISOString()
    );

    try {
      const service = new ArticleFamilySyncService();
      const result = await service.syncFamiliesToLocalDb();

      if (!result.success) {
        console.warn("[CRON] Article family sync warning:", result);
      } else {
        console.log("[CRON] Article family sync result:", result);
      }
    } catch (error) {
      console.error("[CRON] Article family sync failed:", error);
    } finally {
      isRunning = false;
      console.log(
        "[CRON] Article family sync finished at",
        new Date().toISOString()
      );
    }
  });
}
