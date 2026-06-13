const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { authConfig } = require('../config');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_HASH_RE = /^\$2[abxy]\$\d{2}\$/;

const USER_SETTINGS_DEFAULTS = Object.freeze({
  highQualityAudio: true,
  crossfadeSeconds: 0,
  autoplay: true,
  reduceMotion: false,
  notifyNewReleases: true,
  notifyPlaylistUpdates: false,
  displayName: 'Music Lover',
  email: 'user@example.com',
  sidebarExpanded: false,
  theme: 'dark',
  vimNavigation: false,
  soundEffects: false,
});

const refreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, trim: true },
    hash: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const settingsSchema = new mongoose.Schema(
  {
    highQualityAudio: { type: Boolean, default: USER_SETTINGS_DEFAULTS.highQualityAudio },
    crossfadeSeconds: {
      type: Number,
      default: USER_SETTINGS_DEFAULTS.crossfadeSeconds,
      min: 0,
      max: 12,
    },
    autoplay: { type: Boolean, default: USER_SETTINGS_DEFAULTS.autoplay },
    reduceMotion: { type: Boolean, default: USER_SETTINGS_DEFAULTS.reduceMotion },
    notifyNewReleases: { type: Boolean, default: USER_SETTINGS_DEFAULTS.notifyNewReleases },
    notifyPlaylistUpdates: {
      type: Boolean,
      default: USER_SETTINGS_DEFAULTS.notifyPlaylistUpdates,
    },
    displayName: { type: String, default: USER_SETTINGS_DEFAULTS.displayName, trim: true },
    email: { type: String, default: USER_SETTINGS_DEFAULTS.email, lowercase: true, trim: true },
    sidebarExpanded: { type: Boolean, default: USER_SETTINGS_DEFAULTS.sidebarExpanded },
    theme: {
      type: String,
      enum: ['dark', 'oled', 'light', 'hicontrast'],
      default: USER_SETTINGS_DEFAULTS.theme,
    },
    vimNavigation: { type: Boolean, default: USER_SETTINGS_DEFAULTS.vimNavigation },
    soundEffects: { type: Boolean, default: USER_SETTINGS_DEFAULTS.soundEffects },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => EMAIL_RE.test(String(value || '').trim()),
        message: 'Email is invalid',
      },
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
      match: /^[a-zA-Z0-9._-]+$/,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    avatarUrl: { type: String, default: null },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    lastLoginAt: { type: Date, default: null },
    refreshTokenHashes: { type: [refreshTokenSchema], default: [] },
    settings: { type: settingsSchema, default: () => ({ ...USER_SETTINGS_DEFAULTS }) },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('passwordHash')) return;
  const raw = String(this.passwordHash || '');
  if (!raw) throw new Error('passwordHash is required');
  if (BCRYPT_HASH_RE.test(raw)) return;

  this.passwordHash = await bcrypt.hash(raw, authConfig.bcryptRounds);
});

userSchema.methods.comparePassword = function comparePassword(rawPassword) {
  return bcrypt.compare(String(rawPassword || ''), String(this.passwordHash || ''));
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return this.toJSON();
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const out = { ...ret };
    out.id = String(out._id);
    delete out._id;
    delete out.passwordHash;
    delete out.refreshTokenHashes;
    return out;
  },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = {
  User,
  USER_SETTINGS_DEFAULTS,
};
