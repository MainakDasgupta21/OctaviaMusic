/* global describe, it, expect, beforeEach */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'a'.repeat(48);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(48);
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '12';

const { createAuthService } = require('./auth.service');

const BCRYPT_HASH_RE = /^\$2[abxy]\$\d{2}\$/;

let userCounter = 0;
const users = new Map();

class FakeUser {
  constructor(payload) {
    this._id = payload._id || `u-${++userCounter}`;
    this.email = payload.email;
    this.username = payload.username;
    this.passwordHash = payload.passwordHash;
    this.displayName = payload.displayName || payload.username;
    this.avatarUrl = payload.avatarUrl || null;
    this.role = payload.role || 'user';
    this.lastLoginAt = payload.lastLoginAt || null;
    this.refreshTokenHashes = Array.isArray(payload.refreshTokenHashes)
      ? payload.refreshTokenHashes
      : [];
    this.settings = payload.settings || {};
  }

  async save() {
    if (!BCRYPT_HASH_RE.test(String(this.passwordHash || ''))) {
      this.passwordHash = await bcrypt.hash(String(this.passwordHash || ''), 12);
    }
    users.set(String(this._id), this);
    return this;
  }

  async comparePassword(rawPassword) {
    return bcrypt.compare(String(rawPassword || ''), String(this.passwordHash || ''));
  }

  toSafeJSON() {
    return {
      id: String(this._id),
      email: this.email,
      username: this.username,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      role: this.role,
      lastLoginAt: this.lastLoginAt,
      settings: this.settings,
    };
  }

  static async create(payload) {
    const user = new FakeUser(payload);
    await user.save();
    return user;
  }

  static async findOne(query) {
    const rows = Array.from(users.values());
    if (query?.$or) {
      return (
        rows.find((row) =>
          query.$or.some((condition) =>
            Object.entries(condition).every(([key, value]) => row[key] === value))) || null
      );
    }

    return (
      rows.find((row) =>
        Object.entries(query || {}).every(([key, value]) => row[key] === value)) || null
    );
  }

  static async findById(id) {
    return users.get(String(id)) || null;
  }
}

const service = createAuthService({
  UserModel: FakeUser,
  jwtLib: jwt,
  bcryptLib: bcrypt,
});

describe('auth.service', () => {
  beforeEach(() => {
    users.clear();
    userCounter = 0;
  });

  it('registers and logs in users with hashed passwords', async () => {
    const session = await service.register({
      email: 'user@example.com',
      username: 'octavia_user',
      password: 'Password123!',
      displayName: 'Octavia User',
      userAgent: 'vitest',
      ip: '127.0.0.1',
    });

    expect(session.user.email).toBe('user@example.com');
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const stored = await FakeUser.findById(session.user.id);
    expect(stored.passwordHash).not.toBe('Password123!');
    expect(BCRYPT_HASH_RE.test(stored.passwordHash)).toBe(true);

    const login = await service.login({
      email: 'user@example.com',
      password: 'Password123!',
      userAgent: 'vitest',
      ip: '127.0.0.1',
    });
    expect(login.user.id).toBe(session.user.id);
    expect(login.refreshToken).not.toBe(session.refreshToken);
  });

  it('rotates refresh tokens and detects token reuse', async () => {
    const firstSession = await service.register({
      email: 'rotate@example.com',
      username: 'rotate_user',
      password: 'Password123!',
      displayName: 'Rotate User',
      userAgent: 'vitest',
      ip: '127.0.0.1',
    });

    const firstPayload = jwt.verify(firstSession.refreshToken, process.env.JWT_REFRESH_SECRET);
    const rotated = await service.refresh({
      refreshToken: firstSession.refreshToken,
      userAgent: 'vitest',
      ip: '127.0.0.1',
    });
    const rotatedPayload = jwt.verify(rotated.refreshToken, process.env.JWT_REFRESH_SECRET);

    expect(rotatedPayload.jti).not.toBe(firstPayload.jti);

    const userAfterRotate = await FakeUser.findById(firstSession.user.id);
    expect(userAfterRotate.refreshTokenHashes.some((entry) => entry.jti === firstPayload.jti)).toBe(false);
    expect(userAfterRotate.refreshTokenHashes.some((entry) => entry.jti === rotatedPayload.jti)).toBe(true);

    await expect(
      service.refresh({
        refreshToken: firstSession.refreshToken,
        userAgent: 'vitest',
        ip: '127.0.0.1',
      }),
    ).rejects.toThrow(/Session expired/i);

    const userAfterReuse = await FakeUser.findById(firstSession.user.id);
    expect(userAfterReuse.refreshTokenHashes).toHaveLength(0);
  });

  it('logs out current refresh token and supports logout-all', async () => {
    const session = await service.register({
      email: 'logout@example.com',
      username: 'logout_user',
      password: 'Password123!',
      displayName: 'Logout User',
      userAgent: 'vitest',
      ip: '127.0.0.1',
    });

    await service.logout({
      userId: session.user.id,
      refreshToken: session.refreshToken,
    });

    const afterLogout = await FakeUser.findById(session.user.id);
    expect(afterLogout.refreshTokenHashes).toHaveLength(0);

    const nextSession = await service.login({
      email: 'logout@example.com',
      password: 'Password123!',
      userAgent: 'vitest',
      ip: '127.0.0.1',
    });
    expect(nextSession.refreshToken).toBeTruthy();

    await service.logoutAll({ userId: session.user.id });
    const afterLogoutAll = await FakeUser.findById(session.user.id);
    expect(afterLogoutAll.refreshTokenHashes).toHaveLength(0);
  });
});
