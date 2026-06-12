const express = require('express');
const { requireAuth, requireCsrf } = require('../middleware/auth');
const { requireDatabaseConnection } = require('../middleware/db-ready');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/async-handler');
const { updateCurrentUser } = require('../controllers/user.controller');
const { updateCurrentUserSchema } = require('../validators/user.validators');

const router = express.Router();

router.patch(
  '/users/me',
  requireDatabaseConnection,
  requireAuth,
  requireCsrf,
  validate(updateCurrentUserSchema),
  asyncHandler(updateCurrentUser),
);

module.exports = router;
