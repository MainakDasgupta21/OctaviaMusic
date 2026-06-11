const { z, idString } = require('./common');

const listUsersSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: z.object({}).strict(),
  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .strict()
    .optional()
    .default({}),
});

const updateUserRoleSchema = z.object({
  body: z.object({ role: z.enum(['user', 'admin']) }).strict(),
  params: z.object({ id: idString }).strict(),
  query: z.object({}).strict(),
});

const deleteUserSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: z.object({ id: idString }).strict(),
  query: z.object({}).strict(),
});

module.exports = {
  listUsersSchema,
  updateUserRoleSchema,
  deleteUserSchema,
};
