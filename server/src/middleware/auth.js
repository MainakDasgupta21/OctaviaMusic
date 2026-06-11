const jwt = require('jsonwebtoken');
const { authConfig } = require('../config');
const { User } = require('../models/User');
const {
  AuthError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/app-errors');

const getBearerToken = (req) => {
  const value = req.headers?.authorization;
  if (!value || typeof value !== 'string') return null;
  const [scheme, token] = value.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

const getAccessToken = (req) => getBearerToken(req) || req.cookies?.accessToken || null;

const createTokenVerifier =
  ({ jwtLib = jwt, UserModel = User } = {}) =>
  async (token) => {
    const payload = jwtLib.verify(token, authConfig.jwtAccessSecret);
    if (!payload?.sub) throw new AuthError('Invalid authentication token');

    const user = await UserModel.findById(payload.sub)
      .select('_id email username displayName avatarUrl role settings lastLoginAt')
      .lean();
    if (!user) throw new AuthError('Account not found');

    return {
      user,
      tokenPayload: payload,
      token,
    };
  };

const createRequireAuth =
  (deps = {}) =>
  async (req, _res, next) => {
    try {
      const token = getAccessToken(req);
      if (!token) throw new AuthError('Authentication required');
      const verifyToken = createTokenVerifier(deps);
      const { user, tokenPayload } = await verifyToken(token);
      req.user = user;
      req.auth = {
        jti: tokenPayload.jti || null,
        tokenPayload,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };

const createOptionalAuth =
  (deps = {}) =>
  async (req, _res, next) => {
    try {
      const token = getAccessToken(req);
      if (!token) {
        req.user = null;
        return next();
      }
      const verifyToken = createTokenVerifier(deps);
      const { user, tokenPayload } = await verifyToken(token);
      req.user = user;
      req.auth = {
        jti: tokenPayload.jti || null,
        tokenPayload,
      };
      return next();
    } catch (_error) {
      req.user = null;
      return next();
    }
  };

const requireRole = (role) => (req, _res, next) => {
  if (!req.user) return next(new AuthError('Authentication required'));
  if (req.user.role !== role) return next(new ForbiddenError('Insufficient permissions'));
  return next();
};

const requireOwnership =
  (Model, options = {}) =>
  async (req, _res, next) => {
    const {
      paramName = 'id',
      ownerField = 'userId',
      lookupField = '_id',
      attachAs = 'resource',
    } = options;

    if (!req.user) return next(new AuthError('Authentication required'));

    const resourceId = req.params?.[paramName];
    if (!resourceId) return next(new NotFoundError('Resource not found'));

    try {
      const query = {
        [lookupField]: resourceId,
        [ownerField]: req.user._id,
      };
      const resource = await Model.findOne(query).lean();
      if (!resource) return next(new NotFoundError('Resource not found'));
      req[attachAs] = resource;
      return next();
    } catch (_error) {
      return next(new NotFoundError('Resource not found'));
    }
  };

const shouldCheckCsrf = (req) =>
  ['POST', 'PATCH', 'PUT', 'DELETE'].includes(String(req.method || '').toUpperCase());

const requireCsrf = (req, _res, next) => {
  if (!shouldCheckCsrf(req)) return next();
  const usesAuthCookie = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  if (!usesAuthCookie) return next();

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ForbiddenError('CSRF token mismatch'));
  }
  return next();
};

module.exports = {
  getAccessToken,
  createRequireAuth,
  createOptionalAuth,
  requireAuth: createRequireAuth(),
  optionalAuth: createOptionalAuth(),
  requireRole,
  requireOwnership,
  requireCsrf,
};
