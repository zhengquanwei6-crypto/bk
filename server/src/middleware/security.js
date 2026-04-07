const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const isTestEnv = process.env.NODE_ENV === 'test';

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

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => isTestEnv,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isTestEnv,
  message: { success: false, message: '登录尝试过于频繁，请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const xssClean = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
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
