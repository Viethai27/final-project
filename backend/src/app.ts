import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.routes';
import { notFoundMiddleware } from './shared/not-found.middleware';
import { errorMiddleware } from './shared/error.middleware';

export const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api', apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
