/* global describe, it, expect */
const jwt = require('jsonwebtoken');
const { vi } = globalThis;

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'a'.repeat(48);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(48);

const {
  createRequireAuth,
  requireRole,
  requireOwnership,
} = require('./auth');

const runMiddleware = (middleware, req = {}) =>
  new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error));
  });

describe('auth middleware', () => {
  it('requireAuth attaches user from a valid bearer token', async () => {
    const token = jwt.sign(
      { sub: 'user-1', role: 'user', jti: 'jti-1' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );
    const UserModel = {
      findById: vi.fn(() => ({
        select: () => ({
          lean: async () => ({
            _id: 'user-1',
            email: 'user@example.com',
            role: 'user',
          }),
        }),
      })),
    };
    const middleware = createRequireAuth({ jwtLib: jwt, UserModel });
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };

    const error = await runMiddleware(middleware, req);
    expect(error).toBeUndefined();
    expect(req.user).toEqual(
      expect.objectContaining({
        _id: 'user-1',
        role: 'user',
      }),
    );
  });

  it('requireRole rejects non-admin users with 403', async () => {
    const req = { user: { _id: 'user-1', role: 'user' } };
    const middleware = requireRole('admin');

    const error = await runMiddleware(middleware, req);
    expect(error?.statusCode).toBe(403);
  });

  it('requireOwnership returns 404 for resources outside requester scope', async () => {
    const Model = {
      findOne: vi.fn(async () => null),
    };
    const middleware = requireOwnership(Model, { lookupField: 'playlistId' });
    const req = { user: { _id: 'user-1' }, params: { id: 'playlist-2' } };

    const error = await runMiddleware(middleware, req);
    expect(Model.findOne).toHaveBeenCalledWith({
      playlistId: 'playlist-2',
      userId: 'user-1',
    });
    expect(error?.statusCode).toBe(404);
  });
});
