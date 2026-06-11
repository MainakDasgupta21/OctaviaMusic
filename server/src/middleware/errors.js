const { ZodError } = require('zod');
const {
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../utils/app-errors');

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

  return {
    statusCode: 500,
    payload: { error: 'InternalServerError', message: 'Something went wrong' },
  };
};

const errorHandler = (error, _req, res, _next) => {
  const { statusCode, payload } = errorToResponse(error);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const details = error?.stack || error?.message || error;
    console.error('[error]', details);
  } else if (statusCode >= 500) {
    console.error('[error]', error?.message || 'Unhandled server error');
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
};
