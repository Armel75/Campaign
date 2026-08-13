import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import routes from './presentation/http/routes';
import { errorHandler } from './presentation/http/middlewares/errorHandler';
import path from 'path';
import dotenv from 'dotenv';
import { bootstrapAdmin } from './bootstrap/adminBootstrap';
import cookieParser from 'cookie-parser';
import { startCampaignStockSyncCron } from './cron/campaignStockSync.cron';
import { startCampaignAutoCloseCron } from './cron/campaignAutoClose.cron';
import { startGlpiUserSyncCron } from "./cron/glpiUserSync.cron";
import { startArticleFamilySyncCron } from "./cron/articleFamilySync.cron";
import { startWeeklySalesReportCron } from './cron/weeklySalesReport.cron';
import { startCampaignAutoActivateCron } from './cron/campaignAutoActivate.cron';
import { UPLOADS_ROOT_DIR, ensureUploadsDirectories } from './infrastructure/files/uploads';

// Charge l'env depuis prisma/.env (fichier unique, partagé avec Prisma CLI)
dotenv.config({ path: path.join(__dirname, '..', 'prisma', '.env') });

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Suppression de la création automatique du dossier uploads/campaigns au démarrage
app.use('/uploads', express.static(UPLOADS_ROOT_DIR));
app.use(cookieParser());

const WEB_ORIGINS = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (WEB_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use('/api/v1', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use(errorHandler);

async function start() {
  await bootstrapAdmin();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startCampaignStockSyncCron();
    startCampaignAutoCloseCron();
    startGlpiUserSyncCron();
    startArticleFamilySyncCron();
    startWeeklySalesReportCron();
    startCampaignAutoActivateCron();
  });
}

start().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});