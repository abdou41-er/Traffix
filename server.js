import './env.js';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import analyzeRoutes from './routes/analyze.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analyze', analyzeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  // OpenAI API errors
  if (err.status === 429 || err.code === 'rate_limit_exceeded') {
    return res.status(429).json({
      error: 'Rate Limit',
      message: 'Too many requests to OpenAI. Please wait a moment and try again.'
    });
  }

  if (err.code === 'invalid_api_key') {
    return res.status(401).json({
      error: 'Invalid API Key',
      message: 'Invalid OpenAI API key. Please check your configuration.'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    error: 'Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Traffix AI Backend Server                            ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   API Health: http://localhost:${PORT}/api/health          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
