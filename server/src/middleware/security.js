const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

/**
 * 安全中间件集合
 * 包含 HTTP 头加固、速率限制、参数污染防护
 */

/**
 * Helmet — HTTP 安全头
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * 全局速率限制 — 每个 IP 15分钟内最多 100 次请求
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 认证接口速率限制 — 每个 IP 15分钟内最多 10 次
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: '登录尝试过于频繁，请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * XSS 防护 — 清理请求中的恶意内容
 */
const xssClean = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
};

/**
 * HTTP 参数污染防护
 */
const parameterPollution = hpp({
  whitelist: ['tags', 'category', 'sort'],
});

module.exports = {
  securityHeaders,
  globalLimiter,
  authLimiter,
  xssClean,
  parameterPollution,
};
