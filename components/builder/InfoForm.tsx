'use client';

import { useState } from 'react';
import { z } from 'zod';
import type { CardData } from '@/lib/templates/types';

interface InfoFormProps {
  /**
   * Initial field values. This seeds the form's own local state once, on mount —
   * it is deliberately NOT kept in sync afterwards. Binding the inputs straight
   * to server state made typing impossible: every keystroke round-tripped to
   * PATCH, and any rejected intermediate value (e.g. "j" while typing an email)
   * caused React to revert the DOM to the last accepted server value.
   */
  data: Partial<CardData>;
  /** Called on every keystroke with the changed field. The parent debounces persistence. */
  onChange: (patch: Partial<CardData>) => void;
  onLogoUpload: (file: File) => void;
  /** Whether the selected template renders a logo (template.customizable.logo). */
  allowLogo?: boolean;
}

const FIELD_ERRORS: Record<string, string> = {
  email: 'Please enter a valid email address.',
  website: 'Please enter a valid URL.',
  facebook: 'Please enter a valid URL.',
  linkedin: 'Please enter a valid URL.',
  instagram: 'Please enter a valid URL.',
  messenger: 'Please enter a valid URL.',
};

// Field-specific validators
const validators: Record<string, z.ZodTypeAny> = {
  email: z.string().email(),
  website: z.string().url(),
  facebook: z.string().url(),
  linkedin: z.string().url(),
  instagram: z.string().url(),
  messenger: z.string().url(),
};

export function InfoForm({ data, onChange, onLogoUpload, allowLogo = true }: InfoFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Local, always-optimistic copy of the field values: typing is never blocked
  // on (or reverted by) a network round-trip.
  const [values, setValues] = useState<Partial<CardData>>(data);

  function validateField(name: keyof CardData, value: string): string {
    if (!value) {
      return '';
    }
    const validator = validators[name];
    if (validator) {
      const result = validator.safeParse(value);
      if (!result.success) {
        return FIELD_ERRORS[name] ?? 'Invalid value.';
      }
    }
    return '';
  }

  function field(name: keyof CardData) {
    return {
      value: values[name] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setValues(prev => ({ ...prev, [name]: value }));
        onChange({ [name]: value } as Partial<CardData>);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        const error = validateField(name, e.target.value);
        setErrors(prev => ({ ...prev, [name]: error }));
      },
    };
  }

  return (
    <form className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="font-semibold">Required</legend>
        <label>First name<input aria-label="First name" {...field('firstName')} /></label>
        <label>Last name<input aria-label="Last name" {...field('lastName')} /></label>
        <label>Job title<input aria-label="Job title" {...field('jobTitle')} /></label>
        <label>Company<input aria-label="Company" {...field('company')} /></label>
        <label>Mobile number<input aria-label="Mobile number" {...field('mobile')} /></label>
        <label>
          Email
          <input aria-label="Email" {...field('email')} />
          {errors.email && <span role="alert">{errors.email}</span>}
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold">Optional</legend>
        <label>Address<input aria-label="Address" {...field('address')} /></label>
        <label>
          Website
          <input aria-label="Website" {...field('website')} />
          {errors.website && <span role="alert">{errors.website}</span>}
        </label>
        {allowLogo && (
          <label>
            Company logo
            <input
              aria-label="Company logo"
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onLogoUpload(file);
              }}
            />
          </label>
        )}
        <label>Facebook<input aria-label="Facebook" {...field('facebook')} /></label>
        <label>LinkedIn<input aria-label="LinkedIn" {...field('linkedin')} /></label>
        <label>Instagram<input aria-label="Instagram" {...field('instagram')} /></label>
        <label>WhatsApp<input aria-label="WhatsApp" {...field('whatsapp')} /></label>
        <label>Messenger<input aria-label="Messenger" {...field('messenger')} /></label>
      </fieldset>
    </form>
  );
}
