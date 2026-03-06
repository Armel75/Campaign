import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import routes from './presentation/http/routes';
import { errorHandler } from './presentation/http/middlewares/errorHandler';
import "dotenv/config";
import { bootstrapAdmin } from "./bootstrap/adminBootstrap";
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'))
);
app.use(cookieParser());

const WEB_ORIGINS = (process.env.WEB_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman / curl

    if (WEB_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));


app.use('/api/v1', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use(errorHandler);

// console.log("BOOTSTRAP_ENABLED =", process.env.BOOTSTRAP_ENABLED);
// console.log("BOOTSTRAP_ADMIN_USERNAME =", process.env.BOOTSTRAP_ADMIN_USERNAME);

// async function start() {
//   await bootstrapAdmin();
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// }

// start();
async function ensureSuperAdminRole() {

  if (process.env.BOOTSTRAP_ENABLED !== "true") return;

  const roleName = process.env.BOOTSTRAP_ADMIN_ROLE || "SUPER_ADMIN";

  const role = await prisma.role.findUnique({
    where: { name: roleName }
  });

  if (!role) {
    await prisma.role.create({
      data: {
        name: roleName
      }
    });

    console.log(`Role ${roleName} created`);
  }
}

async function start() {

  await ensureSuperAdminRole();   // création du rôle
  await bootstrapAdmin();         // création de l'utilisateur admin

  app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
  );
}

start();