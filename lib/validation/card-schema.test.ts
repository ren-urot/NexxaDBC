import { describe, it, expect } from 'vitest';
import { cardDataSchema, cardDataPartialSchema, styleOverridesSchema } from './card-schema';

describe('cardDataSchema', () => {
  const valid = {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    jobTitle: 'Sales Director',
    company: 'ABC Corporation',
    mobile: '+639171234567',
    email: 'juan@abc.com',
  };

  it('accepts a payload with only required fields', () => {
    expect(cardDataSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a payload missing a required field', () => {
    const { email: _email, ...rest } = valid;
    expect(cardDataSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(cardDataSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('accepts optional fields when valid', () => {
    const result = cardDataSchema.safeParse({
      ...valid,
      website: 'https://abc.com',
      linkedin: 'https://linkedin.com/in/juan',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid optional url', () => {
    expect(cardDataSchema.safeParse({ ...valid, website: 'not-a-url' }).success).toBe(false);
  });

  it('accepts an empty string for an optional url field (cleared, not invalid)', () => {
    const result = cardDataSchema.safeParse({ ...valid, website: '', facebook: '' });
    expect(result.success).toBe(true);
  });
});

describe('cardDataPartialSchema', () => {
  it('accepts a single-field patch', () => {
    expect(cardDataPartialSchema.safeParse({ firstName: 'Maria' }).success).toBe(true);
  });

  it('accepts an empty object', () => {
    expect(cardDataPartialSchema.safeParse({}).success).toBe(true);
  });

  it('accepts an empty string for every format-constrained optional field', () => {
    // Regression: clearing any of these back to '' used to fail .url()/.email()
    // validation (only `undefined` satisfied `.optional()`), permanently
    // wedging the debounced PATCH queue in BuilderWizard.
    const result = cardDataPartialSchema.safeParse({
      email: '',
      website: '',
      logoUrl: '',
      facebook: '',
      linkedin: '',
      instagram: '',
      messenger: '',
    });
    expect(result.success).toBe(true);
  });

  it('still rejects a non-empty invalid url or email', () => {
    expect(cardDataPartialSchema.safeParse({ website: 'not-a-url' }).success).toBe(false);
    expect(cardDataPartialSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('styleOverridesSchema', () => {
  it('accepts a valid hex accent color and font size step', () => {
    expect(styleOverridesSchema.safeParse({ accentColor: '#1a2b3c', fontSizeStep: 1 }).success).toBe(true);
  });

  it('rejects a non-hex accent color', () => {
    expect(styleOverridesSchema.safeParse({ accentColor: 'blue' }).success).toBe(false);
  });

  it('rejects a font size step outside -2..2', () => {
    expect(styleOverridesSchema.safeParse({ fontSizeStep: 5 }).success).toBe(false);
  });
});
