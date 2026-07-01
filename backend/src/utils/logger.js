import fs from 'fs';
import path from 'path';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function writeLog(fileName, payload) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...payload }) + '\n';
  fs.appendFile(path.join(logDir, fileName), line, (err) => {
    if (err) console.error('Log write failed:', err.message);
  });
}

export const logger = {
  info(message, meta = {}) { writeLog('system.log', { level: 'info', message, meta }); },
  error(message, meta = {}) { writeLog('error.log', { level: 'error', message, meta }); },
  security(message, meta = {}) { writeLog('security.log', { level: 'security', message, meta }); },
  api(req, res, ms) {
    writeLog('api.log', {
      level: 'api',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms,
      user_id: req.user?.id || null,
      ip: req.ip,
      request_id: req.requestId
    });
  }
};
