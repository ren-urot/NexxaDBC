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

const inputClass =
  'mt-1.5 w-full rounded-xs border-b border-line bg-transparent py-1.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan';
const microLabelClass = 'font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft';

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

  // A plain helper that returns JSX (not a component invoked as `<X />`), so
  // it doesn't get a fresh identity — and therefore a remounted <input> that
  // loses focus mid-keystroke — on every render the way a component defined
  // inside another component's body would.
  function renderField(label: string, name: keyof CardData) {
    const errorText = errors[name as string];
    return (
      <label key={name} className="block">
        <span className={microLabelClass}>{label}</span>
        <input aria-label={label} className={inputClass} {...field(name)} />
        {errorText && (
          <span role="alert" className="mt-1 block text-xs text-[#b3452c]">
            {errorText}
          </span>
        )}
      </label>
    );
  }

  return (
    <form className="space-y-10">
      <fieldset className="space-y-5">
        <legend className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-scan">
          Required — the plate
        </legend>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {renderField('First name', 'firstName')}
          {renderField('Last name', 'lastName')}
          {renderField('Job title', 'jobTitle')}
          {renderField('Company', 'company')}
          {renderField('Mobile number', 'mobile')}
          {renderField('Email', 'email')}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
          Optional — finishing
        </legend>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {renderField('Address', 'address')}
          {renderField('Website', 'website')}
          {allowLogo && (
            <label className="block">
              <span className={microLabelClass}>Company logo</span>
              <input
                aria-label="Company logo"
                type="file"
                accept="image/*"
                className="mt-1.5 block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:tracking-[0.1em] file:text-paper"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onLogoUpload(file);
                }}
              />
            </label>
          )}
          {renderField('Facebook', 'facebook')}
          {renderField('LinkedIn', 'linkedin')}
          {renderField('Instagram', 'instagram')}
          {renderField('WhatsApp', 'whatsapp')}
          {renderField('Messenger', 'messenger')}
        </div>
      </fieldset>
    </form>
  );
}
