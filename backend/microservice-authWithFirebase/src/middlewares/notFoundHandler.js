function notFoundHandler(req, res) {
  return res.status(404).json({
    error: 'O recurso solicitado não foi encontrado.'
  });
}

module.exports = notFoundHandler;
