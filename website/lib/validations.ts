import { z } from 'zod';

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required');

// Username validation
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(100, 'Username must be less than 100 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Signup email schema
export const signupEmailSchema = z.object({
  email: emailSchema,
});

// Signup username schema
export const signupUsernameSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
});

// Signup password schema
export const signupPasswordSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Signup categories schema
export const signupCategoriesSchema = z.object({
  userId: z.string(),
  categoryIds: z.array(z.number()).min(1, 'Please select at least one category'),
});

// Signin schema
export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Profile update schema
export const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

// Category preference schema
export const categoryPreferenceSchema = z.object({
  categoryIds: z.array(z.number()).min(1, 'Please select at least one category'),
});
