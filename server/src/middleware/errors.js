const { ZodError } = require('zod');
const {
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ServiceUnavailableError,
} = require('../utils/app-errors');

const DB_ERROR_NAME_RE =
  /(MongooseServerSelectionError|MongoNetworkError|MongoServerSelectionError|MongoServerError|MongooseError)/i;
const DB_ERROR_MESSAGE_RE =
  /(buffering timed out|server selection|unable to connect|could not connect to any servers|topology was destroyed|econnrefused|enotfound|connection timed out|before initial connection is complete|client must be connected|not authorized|authentication failed)/i;

const isDbUnavailableError = (error) =>
  Boolean(
    error
    && !(error?.name === 'MongoServerError' && error?.code === 11000)
    && (DB_ERROR_NAME_RE.test(String(error.name || ''))
      || DB_ERROR_MESSAGE_RE.test(String(error.message || ''))),
  );

const errorToResponse = (error) => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      payload: {
        error: error.name,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  if (error instanceof ZodError) {
    const wrapped = new ValidationError('Request validation failed', error.flatten());
    return {
      statusCode: wrapped.statusCode,
      payload: { error: wrapped.name, message: wrapped.message, details: wrapped.details },
    };
  }

  if (error?.name === 'ValidationError') {
    return {
      statusCode: 400,
      payload: {
        error: 'ValidationError',
        message: 'Validation failed',
        details: error.errors || null,
      },
    };
  }

  if (error?.name === 'CastError') {
    const wrapped = new NotFoundError('Resource not found');
    return {
      statusCode: wrapped.statusCode,
      payload: { error: wrapped.name, message: wrapped.message },
    };
  }

  if (error?.name === 'MongoServerError' && error?.code === 11000) {
    const wrapped = new ConflictError('Resource already exists');
    return {
      statusCode: wrapped.statusCode,
      payload: { error: wrapped.name, message: wrapped.message },
    };
  }

  if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
    const wrapped = new AuthError('Invalid or expired token');
    return {
      statusCode: wrapped.statusCode,
      payload: { error: wrapped.name, message: wrapped.message },
    };
  }

  if (isDbUnavailableError(error)) {
    const wrapped = new ServiceUnavailableError(
      'Authentication is temporarily unavailable. Please try again shortly.',
    );
    return {
      statusCode: wrapped.statusCode,
      payload: {
        error: wrapped.name,
        message: wrapped.message,
        // TEMP DIAGNOSTIC: surface the real DB error. Remove after root-cause is captured.
        debug: { name: error?.name, message: error?.message, code: error?.code },
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      error: 'InternalServerError',
      message: 'Something went wrong',
      // TEMP DIAGNOSTIC: surface the real error. Remove after root-cause is captured.
      debug: { name: error?.name, message: error?.message, code: error?.code },
    },
  };
};

const errorHandler = (error, _req, res, _next) => {
  const { statusCode, payload } = errorToResponse(error);

  if (statusCode >= 500) {
    // TEMP DIAGNOSTIC: always log full stack while we capture the production cause.
    console.error('[error]', error?.stack || error?.message || error);
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  errorHandler,
  errorToResponse,
  ValidationError,
  AuthError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ServiceUnavailableError,
  isDbUnavailableError,
};
