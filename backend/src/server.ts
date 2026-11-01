import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/index.js';
import { initWebSocketServer } from './websocket/index.js';
import {
  securityHeaders,
  apiRateLimiter,
  authRateLimiter,
  sanitizeInput,
} from './middleware/security.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const IS_PROD = process.env.NODE_ENV === 'production';

// OWASP Security Headers & Global Middlewares
app.use(securityHeaders);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [FRONTEND_URL];
    if (!IS_PROD) {
      allowed.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000');
    }
    const isAllowed =
      allowed.includes(origin) ||
      /^https:\/\/[\w-]+(\.vercel\.app)$/.test(origin) ||
      (!IS_PROD && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    if (isAllowed) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

// Request logger (dev only)
if (!IS_PROD) {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Rate limiters
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);

// Mount API routes
app.use('/api', apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Gola Backend Server running on port ${PORT} [${IS_PROD ? 'production' : 'development'}]`);
});
