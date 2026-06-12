const express = require('express');
const { authLimiter, authRegisterLimiter } = require('../middleware/rate-limiters');
const { validate } = require('../middleware/validate');
const { requireDatabaseConnection } = require('../middleware/db-ready');
const { requireAuth, requireCsrf } = require('../middleware/auth');
const { asyncHandler } = require('../utils/async-handler');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} = require('../validators/auth.validators');
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  me,
} = require('../controllers/auth.controller');

const router = express.Router();

router.use(requireDatabaseConnection);

router.post('/auth/register', authRegisterLimiter, validate(registerSchema), asyncHandler(register));
router.post('/auth/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.post('/auth/refresh', authLimiter, validate(refreshSchema), asyncHandler(refresh));
router.post('/auth/logout', requireAuth, requireCsrf, asyncHandler(logout));
router.post('/auth/logout-all', requireAuth, requireCsrf, asyncHandler(logoutAll));
router.post(
  '/auth/change-password',
  requireAuth,
  requireCsrf,
  validate(changePasswordSchema),
  asyncHandler(changePassword),
);
router.get('/auth/me', requireAuth, asyncHandler(me));

module.exports = router;
