export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

export function positiveNumber(value, fieldName = 'amount') {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const error = new Error(`${fieldName} must be a positive number.`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

export function ok(res, data = {}) { return res.json(data); }
