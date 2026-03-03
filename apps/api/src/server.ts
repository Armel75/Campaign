import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import routes from './presentation/http/routes';
import { errorHandler } from './presentation/http/middlewares/errorHandler';
import "dotenv/config";
import { bootstrapAdmin } from "./bootstrap/adminBootstrap";
import cookieParser from 'cookie-parser';

const app = express();

const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
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

console.log("BOOTSTRAP_ENABLED =", process.env.BOOTSTRAP_ENABLED);
console.log("BOOTSTRAP_ADMIN_USERNAME =", process.env.BOOTSTRAP_ADMIN_USERNAME);

async function start() {
  await bootstrapAdmin();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();