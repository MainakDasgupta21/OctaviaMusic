const { z } = require('./common');

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/);
const passwordSchema = z.string().min(8).max(128);

const registerSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      username: usernameSchema,
      password: passwordSchema,
      displayName: z.string().trim().min(1).max(80).optional(),
    })
    .strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

const loginSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      password: passwordSchema,
    })
    .strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

const refreshSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().trim().min(1).optional(),
    })
    .strict()
    .optional()
    .default({}),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: passwordSchema,
      newPassword: passwordSchema,
    })
    .strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  emailSchema,
  usernameSchema,
  passwordSchema,
};
