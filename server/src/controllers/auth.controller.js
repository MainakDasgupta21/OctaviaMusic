const authService = require('../services/auth.service');
const { authConfig } = require('../config');
const { buildAuthCookieOptions, createCsrfToken } = require('../utils/auth');
const { AuthError } = require('../utils/app-errors');

const cookieOptions = buildAuthCookieOptions(authConfig);

const setSessionCookies = (res, session) => {
  res.cookie('accessToken', session.accessToken, cookieOptions.access);
  res.cookie('refreshToken', session.refreshToken, cookieOptions.refresh);
  res.cookie('csrfToken', session.csrfToken, cookieOptions.csrf);
};

const clearSessionCookies = (res) => {
  res.clearCookie('accessToken', { ...cookieOptions.access, maxAge: undefined });
  res.clearCookie('refreshToken', { ...cookieOptions.refresh, maxAge: undefined });
  res.clearCookie('csrfToken', { ...cookieOptions.csrf, maxAge: undefined });
};

const getRefreshTokenFromRequest = (req) =>
  req.body?.refreshToken || req.cookies?.refreshToken || null;

const register = async (req, res) => {
  const session = await authService.register({
    ...req.body,
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip || null,
  });
  setSessionCookies(res, session);
  res.status(201).json({ user: session.user, csrfToken: session.csrfToken });
};

const login = async (req, res) => {
  const session = await authService.login({
    ...req.body,
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip || null,
  });
  setSessionCookies(res, session);
  res.json({ user: session.user, csrfToken: session.csrfToken });
};

const refresh = async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) throw new AuthError('Refresh token is required');
  const session = await authService.refresh({
    refreshToken,
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip || null,
  });
  setSessionCookies(res, session);
  res.json({ user: session.user, csrfToken: session.csrfToken });
};

const logout = async (req, res) => {
  await authService.logout({
    userId: req.user?._id,
    refreshToken: getRefreshTokenFromRequest(req),
  });
  clearSessionCookies(res);
  res.status(204).send();
};

const logoutAll = async (req, res) => {
  await authService.logoutAll({
    userId: req.user?._id,
  });
  clearSessionCookies(res);
  res.status(204).send();
};

const changePassword = async (req, res) => {
  await authService.changePassword({
    userId: req.user?._id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  clearSessionCookies(res);
  res.status(204).send();
};

const me = async (req, res) => {
  const user = await authService.getCurrentUser({ userId: req.user?._id });
  // Return a token that always matches the cookie so the cross-site SPA (which
  // cannot read the backend's cookie) can echo it in the x-csrf-token header.
  let csrfToken = req.cookies?.csrfToken;
  if (!csrfToken) {
    csrfToken = createCsrfToken();
    res.cookie('csrfToken', csrfToken, cookieOptions.csrf);
  }
  res.json({ user, csrfToken });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  me,
  setSessionCookies,
  clearSessionCookies,
};
