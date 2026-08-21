import { z } from 'zod';

export const cardDataSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().min(1).max(150),
  company: z.string().min(1).max(150),
  mobile: z.string().min(7).max(30),
  email: z.string().email(),
  address: z.string().max(500).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  facebook: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  instagram: z.string().url().optional(),
  whatsapp: z.string().max(30).optional(),
  messenger: z.string().url().optional(),
});

export const cardDataPartialSchema = cardDataSchema.partial();

export const styleOverridesSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontSizeStep: z.number().int().min(-2).max(2).optional(),
});

export type CardDataInput = z.infer<typeof cardDataSchema>;
export type CardDataPartialInput = z.infer<typeof cardDataPartialSchema>;
export type StyleOverridesInput = z.infer<typeof styleOverridesSchema>;
