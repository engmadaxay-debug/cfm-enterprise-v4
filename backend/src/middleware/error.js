export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  const databaseConflict = ['23503', '23505'].includes(error.code);
  const status = error.status || (databaseConflict ? 409 : 500);
  const conflictMessage = error.code === '23503'
    ? 'This item is linked to other records and cannot be deleted.'
    : error.code === '23505'
      ? 'That email, vault name, or other unique value is already in use.'
      : error.message;
  res.status(status).json({
    message: status === 500 ? 'Unexpected server error.' : conflictMessage,
    detail: process.env.NODE_ENV === 'development' ? error.detail : undefined,
  });
}
