/* global describe, it, expect */
const { errorToResponse, isDbUnavailableError } = require('./errors');

describe('error middleware db mapping', () => {
  it('detects mongoose server-selection failures', () => {
    const error = {
      name: 'MongooseServerSelectionError',
      message: 'Could not connect to any servers in your MongoDB Atlas cluster.',
    };
    expect(isDbUnavailableError(error)).toBe(true);
  });

  it('maps db connectivity errors to 503', () => {
    const error = {
      name: 'MongoNetworkError',
      message: 'connection timed out',
    };
    const result = errorToResponse(error);
    expect(result.statusCode).toBe(503);
    expect(result.payload).toMatchObject({
      error: 'ServiceUnavailableError',
      message: 'Authentication is temporarily unavailable. Please try again shortly.',
    });
  });

  it('maps non-duplicate MongoServerError to 503', () => {
    const error = {
      name: 'MongoServerError',
      code: 13,
      message: 'not authorized on octavia to execute command',
    };
    const result = errorToResponse(error);
    expect(result.statusCode).toBe(503);
    expect(result.payload.error).toBe('ServiceUnavailableError');
  });

  it('keeps unknown errors as generic 500', () => {
    const result = errorToResponse(new Error('Unexpected failure'));
    expect(result.statusCode).toBe(500);
    expect(result.payload.error).toBe('InternalServerError');
  });
});
