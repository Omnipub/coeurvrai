import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { config } from './utils/config';
import { pool } from './utils/db';
import { redis } from './utils/redis';
import { errorHandler, notFound } from './middleware/error';
import authRouter from './api/auth';
import accountRouter from './api/account';
import profileRouter from './api/profile';
import likeRouter from './api/like';
import reportRouter from './api/report';
import verificationRouter from './api/verification';
import { registerChat } from './socket/chat';

/** Construit l'application (sans écouter de port), pour le serveur et les tests. */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  // L'API ne doit jamais être indexée (profils, messages : risque d'outing).
  app.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    next();
  });
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  });
  app.use(cors({ origin: config.corsOrigin, credentials: true, exposedHeaders: ['Content-Disposition'] }));
  app.use(
    express.json({
      limit: '100kb',
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      await redis.ping();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/profiles', profileRouter);
  app.use('/api/likes', likeRouter);
  app.use('/api/verification', verificationRouter);
  app.use('/api', reportRouter);

  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: config.corsOrigin, credentials: true } });
  app.set('io', io);
  registerChat(io);

  return { app, server, io };
}
