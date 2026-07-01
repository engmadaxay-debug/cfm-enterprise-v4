import { logger } from '../utils/logger.js';

export function apiAccessLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => logger.api(req, res, Date.now() - started));
  next();
}
