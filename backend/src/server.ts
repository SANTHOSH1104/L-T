import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import { initDatabase } from './db/mysql';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// 2. Rate Limiting for Brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // max 100 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// 3. CORS & Parsers
app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 4. Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'PunchPulse HR SaaS Backend',
    database: 'XAMPP MySQL (punchpulse_hr)',
    security: 'Helmet + RateLimiter + Yup active',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 5. Global Error Handling Middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Server Error',
  });
});

// Initialize database & Start Server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
      console.log(`🔒 Admin Auth & XAMPP MySQL Database active!`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
