import { z } from 'zod';

/**
 * A format-constrained optional field (URL fields below) must accept '' as
 * equivalent to "not provided." Plain `.url().optional()` only accepts
 * `undefined` — an explicit `''` (e.g. from a user clearing the field back
 * out) fails `.url()` and 400s. Unioning in the empty-string literal makes
 * "cleared" a valid value instead of an invalid one.
 */
const optionalUrl = z.union([z.literal(''), z.string().url()]).optional();

/** Same reasoning as `optionalUrl`, for the one `.email()` field. */
const optionalEmail = z.union([z.literal(''), z.string().email()]).optional();

export const cardDataSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().min(1).max(150),
  company: z.string().min(1).max(150),
  mobile: z.string().min(7).max(30),
  email: z.string().email(),
  address: z.string().max(500).optional(),
  website: optionalUrl,
  logoUrl: optionalUrl,
  facebook: optionalUrl,
  linkedin: optionalUrl,
  instagram: optionalUrl,
  whatsapp: z.string().max(30).optional(),
  messenger: optionalUrl,
});

// PATCH validation only: `email` is required for a *submitted* card
// (cardDataSchema keeps it strict), but a draft mid-edit must be able to
// save a transiently-cleared email the same way it can clear website/social
// links — otherwise clearing Email hits the exact same dead end as clearing
// Website. Submission itself still 422s on a missing/empty email via
// cardDataSchema in the submit route.
export const cardDataPartialSchema = cardDataSchema.partial().extend({
  email: optionalEmail,
});

export const styleOverridesSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontSizeStep: z.number().int().min(-2).max(2).optional(),
});

export type CardDataInput = z.infer<typeof cardDataSchema>;
export type CardDataPartialInput = z.infer<typeof cardDataPartialSchema>;
export type StyleOverridesInput = z.infer<typeof styleOverridesSchema>;
