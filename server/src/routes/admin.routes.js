const express = require('express');
const { requireAuth, requireRole, requireCsrf } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/async-handler');
const { listUsers, updateUserRole, deleteUser } = require('../controllers/admin.controller');
const {
  listUsersSchema,
  updateUserRoleSchema,
  deleteUserSchema,
} = require('../validators/admin.validators');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/admin/users', validate(listUsersSchema), asyncHandler(listUsers));
router.patch(
  '/admin/users/:id/role',
  requireCsrf,
  validate(updateUserRoleSchema),
  asyncHandler(updateUserRole),
);
router.delete(
  '/admin/users/:id',
  requireCsrf,
  validate(deleteUserSchema),
  asyncHandler(deleteUser),
);

module.exports = router;
