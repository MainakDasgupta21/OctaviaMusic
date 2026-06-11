const { ValidationError } = require('../utils/app-errors');

const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return next(
      new ValidationError('Request validation failed', result.error.flatten()),
    );
  }

  const { body, params, query } = result.data;
  if (body) req.body = body;
  if (params) req.params = params;
  if (query) req.query = query;
  req.validated = result.data;
  return next();
};

module.exports = {
  validate,
};
