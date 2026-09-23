import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { config } from './utils/config';
import { pool } from './utils/db';
import { connectRedis, redis } from './utils/redis';
import { errorHandler, notFound } from './middleware/error';
import authRouter from './api/auth';
import profileRouter from './api/profile';
import likeRouter from './api/like';
import reportRouter from './api/report';
import { registerChat } from './socket/chat';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));

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
app.use('/api/profiles', profileRouter);
app.use('/api/likes', likeRouter);
app.use('/api', reportRouter);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.corsOrigin, credentials: true } });
app.set('io', io);
registerChat(io);

async function start(): Promise<void> {
  await connectRedis();
  server.listen(config.port, () => {
    console.log(`API coeur-vrai démarrée sur http://localhost:${config.port}`);
  });
}

async function shutdown(): Promise<void> {
  io.close();
  server.close();
  await Promise.allSettled([pool.end(), redis.quit()]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  console.error('Échec du démarrage :', err);
  process.exit(1);
});
