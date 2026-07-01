import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

export const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait and try again.' }
});

export function requestId(req, res, next) {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

export function requireJson(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ success: false, message: 'Content-Type must be application/json' });
  }
  next();
}

export function sanitizeBody(req, res, next) {
  const clean = (value) => {
    if (typeof value === 'string') return value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
    }
    return value;
  };
  if (req.body) req.body = clean(req.body);
  next();
}

export function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
    if (missing.length) {
      return res.status(400).json({ success: false, message: 'Missing required fields', missing });
    }
    next();
  };
}
