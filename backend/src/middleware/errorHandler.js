function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  const message = status === 500
    ? 'Ocurrió un error interno en el servidor.'
    : error.message;

  return res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };