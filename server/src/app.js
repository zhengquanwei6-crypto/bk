require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { securityHeaders, globalLimiter, xssClean, parameterPollution } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// 路由
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');
const searchRoutes = require('./routes/search');

const app = express();

// ── 连接数据库与缓存 ──────────────────
connectDB();
connectRedis();

// ── 全局中间件 ─────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(securityHeaders);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xssClean);
app.use(parameterPollution);
app.use(globalLimiter);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── API 路由 ───────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/search', searchRoutes);

// ── 错误处理 ───────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── 启动服务 ───────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 [服务器] 运行于 http://localhost:${PORT}`);
  console.log(`📦 [环境] ${process.env.NODE_ENV || 'development'}\n`);
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('[服务器] 收到 SIGTERM 信号，正在关闭...');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => {
  console.error('[未处理的 Promise 拒绝]', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
