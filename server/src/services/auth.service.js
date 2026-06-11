const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { authConfig } = require('../config');
const { User } = require('../models/User');
const {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
} = require('../utils/app-errors');
const {
  parseDurationToMs,
  hashToken,
  compareTokenHash,
  createCsrfToken,
  createJti,
} = require('../utils/auth');

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

const ensureJwtSecrets = () => {
  if (!authConfig.jwtAccessSecret || !authConfig.jwtRefreshSecret) {
    throw new Error('JWT secrets are not configured');
  }
  if (Buffer.byteLength(authConfig.jwtAccessSecret, 'utf8') < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 bytes');
  }
  if (Buffer.byteLength(authConfig.jwtRefreshSecret, 'utf8') < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 bytes');
  }
};

const refreshTtlMs = () => parseDurationToMs(authConfig.jwtRefreshTtl, 30 * 24 * 60 * 60000);

const toSafeUser = (user) => {
  if (!user) return null;
  if (typeof user.toSafeJSON === 'function') return user.toSafeJSON();
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  const out = { ...plain };
  delete out.passwordHash;
  delete out.refreshTokenHashes;
  return out;
};

const pruneExpiredRefreshTokens = (user, now = new Date()) => {
  const rows = Array.isArray(user.refreshTokenHashes) ? user.refreshTokenHashes : [];
  user.refreshTokenHashes = rows.filter((entry) => {
    if (!entry?.expiresAt) return false;
    return new Date(entry.expiresAt).getTime() > now.getTime();
  });
};

const signAccessToken = ({ userId, role, jti }, jwtLib = jwt) =>
  jwtLib.sign({ sub: userId, role, jti }, authConfig.jwtAccessSecret, {
    expiresIn: authConfig.jwtAccessTtl,
  });

const signRefreshToken = ({ userId, jti }, jwtLib = jwt) =>
  jwtLib.sign({ sub: userId, jti }, authConfig.jwtRefreshSecret, {
    expiresIn: authConfig.jwtRefreshTtl,
  });

const decodeRefreshToken = (token, jwtLib = jwt) =>
  jwtLib.verify(token, authConfig.jwtRefreshSecret);

const decodeRefreshTokenLoose = (token, jwtLib = jwt) => {
  try {
    return jwtLib.verify(token, authConfig.jwtRefreshSecret);
  } catch (_error) {
    return jwtLib.decode(token) || null;
  }
};

const createAuthService = ({
  UserModel = User,
  jwtLib = jwt,
  bcryptLib = bcrypt,
} = {}) => {
  const issueSession = async (user, { userAgent = null, ip = null } = {}) => {
    ensureJwtSecrets();
    const now = new Date();
    pruneExpiredRefreshTokens(user, now);

    const accessJti = createJti();
    const refreshJti = createJti();
    const accessToken = signAccessToken(
      { userId: String(user._id), role: user.role, jti: accessJti },
      jwtLib,
    );
    const refreshToken = signRefreshToken({ userId: String(user._id), jti: refreshJti }, jwtLib);

    user.refreshTokenHashes.push({
      jti: refreshJti,
      hash: hashToken(refreshToken),
      createdAt: now,
      expiresAt: new Date(now.getTime() + refreshTtlMs()),
      userAgent: userAgent || null,
      ip: ip || null,
    });
    user.lastLoginAt = now;
    await user.save();

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      csrfToken: createCsrfToken(),
    };
  };

  const register = async ({
    email,
    username,
    password,
    displayName,
    userAgent,
    ip,
  }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedUsername = String(username || '').trim();

    const existing = await UserModel.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });
    if (existing) throw new ConflictError('User already exists');

    const user = await UserModel.create({
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash: password,
      displayName: String(displayName || normalizedUsername || 'Music Lover').trim(),
      settings: {
        displayName: String(displayName || normalizedUsername || 'Music Lover').trim(),
        email: normalizedEmail,
      },
    });

    return issueSession(user, { userAgent, ip });
  };

  const login = async ({ email, password, userAgent, ip }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) throw new AuthError(INVALID_CREDENTIALS_MESSAGE);

    let valid = false;
    if (typeof user.comparePassword === 'function') {
      valid = await user.comparePassword(password);
    } else {
      valid = await bcryptLib.compare(String(password || ''), String(user.passwordHash || ''));
    }
    if (!valid) throw new AuthError(INVALID_CREDENTIALS_MESSAGE);

    return issueSession(user, { userAgent, ip });
  };

  const refresh = async ({ refreshToken, userAgent, ip }) => {
    ensureJwtSecrets();
    if (!refreshToken) throw new AuthError('Refresh token is required');

    let payload = null;
    try {
      payload = decodeRefreshToken(refreshToken, jwtLib);
    } catch (_error) {
      throw new AuthError('Invalid refresh token');
    }
    const userId = payload?.sub;
    const oldJti = payload?.jti;
    if (!userId || !oldJti) throw new AuthError('Invalid refresh token');

    const user = await UserModel.findById(userId);
    if (!user) throw new AuthError('Invalid refresh token');

    pruneExpiredRefreshTokens(user);

    const tokenRows = Array.isArray(user.refreshTokenHashes) ? user.refreshTokenHashes : [];
    const rowIndex = tokenRows.findIndex((entry) => entry.jti === oldJti);
    const presentedHash = hashToken(refreshToken);

    if (rowIndex < 0) {
      // Refresh-token reuse (or replay) detected: revoke all sessions.
      user.refreshTokenHashes = [];
      await user.save();
      throw new AuthError('Session expired. Please sign in again.');
    }

    const matchedRow = tokenRows[rowIndex];
    if (!compareTokenHash(matchedRow.hash, presentedHash)) {
      user.refreshTokenHashes = [];
      await user.save();
      throw new AuthError('Session expired. Please sign in again.');
    }

    user.refreshTokenHashes.splice(rowIndex, 1);
    return issueSession(user, { userAgent, ip });
  };

  const logout = async ({ userId, refreshToken }) => {
    if (!userId) return;
    const user = await UserModel.findById(userId);
    if (!user) return;

    if (!refreshToken) {
      await user.save();
      return;
    }

    const payload = decodeRefreshTokenLoose(refreshToken, jwtLib);
    const jti = payload?.jti;
    if (jti) {
      user.refreshTokenHashes = (user.refreshTokenHashes || []).filter(
        (entry) => entry?.jti !== jti,
      );
    }
    await user.save();
  };

  const logoutAll = async ({ userId }) => {
    if (!userId) return;
    const user = await UserModel.findById(userId);
    if (!user) return;
    user.refreshTokenHashes = [];
    await user.save();
  };

  const changePassword = async ({ userId, currentPassword, newPassword }) => {
    if (!userId) throw new NotFoundError('User not found');
    const user = await UserModel.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    let valid = false;
    if (typeof user.comparePassword === 'function') {
      valid = await user.comparePassword(currentPassword);
    } else {
      valid = await bcryptLib.compare(
        String(currentPassword || ''),
        String(user.passwordHash || ''),
      );
    }
    if (!valid) throw new AuthError(INVALID_CREDENTIALS_MESSAGE);
    if (String(currentPassword || '') === String(newPassword || '')) {
      throw new ValidationError('New password must be different from current password');
    }

    user.passwordHash = String(newPassword || '');
    user.refreshTokenHashes = [];
    await user.save();
    return toSafeUser(user);
  };

  const getCurrentUser = async ({ userId }) => {
    if (!userId) throw new AuthError('Authentication required');
    const user = await UserModel.findById(userId).select(
      '_id email username displayName avatarUrl role settings createdAt updatedAt lastLoginAt',
    );
    if (!user) throw new AuthError('Authentication required');
    return toSafeUser(user);
  };

  return {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    changePassword,
    getCurrentUser,
    toSafeUser,
  };
};

const authService = createAuthService();

module.exports = {
  createAuthService,
  ...authService,
  INVALID_CREDENTIALS_MESSAGE,
};
