const { z, settingsSchema, avatarUrlSchema } = require('./common');

const updateCurrentUserSchema = z.object({
  body: z
    .object({
      displayName: z.string().trim().min(1).max(80).optional(),
      avatarUrl: avatarUrlSchema.optional(),
      email: z.string().trim().email().max(254).optional(),
      settings: settingsSchema.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field must be updated',
    }),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

module.exports = {
  updateCurrentUserSchema,
};
