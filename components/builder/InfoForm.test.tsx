import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { InfoForm } from './InfoForm';
import type { CardData } from '@/lib/templates/types';

interface InfoFormWrapperProps {
  data?: Partial<CardData>;
  onChange?: (patch: Partial<CardData>) => void;
  onLogoUpload?: (file: File) => Promise<void>;
  allowLogo?: boolean;
}

// Wrapper component that simulates parent behavior
function InfoFormWrapper(props: InfoFormWrapperProps) {
  const [data, setData] = useState<Partial<CardData>>(props.data || {});
  return (
    <InfoForm
      data={data}
      allowLogo={props.allowLogo}
      onChange={(patch) => {
        setData((prev) => ({ ...prev, ...patch }));
        props.onChange?.(patch);
      }}
      onLogoUpload={props.onLogoUpload ?? (() => Promise.resolve())}
    />
  );
}

describe('InfoForm', () => {
  it('renders all required and optional fields', () => {
    render(<InfoFormWrapper data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    for (const label of ['First name', 'Last name', 'Job title', 'Mobile number', 'Email']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    for (const label of ['Company', 'Website', 'Address', 'LinkedIn', 'Facebook', 'Instagram', 'WhatsApp', 'Messenger']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('calls onChange with a field patch when a field is edited', async () => {
    const onChange = vi.fn();
    render(<InfoFormWrapper data={{}} onChange={onChange} onLogoUpload={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('First name'), 'J');
    expect(onChange).toHaveBeenCalledWith({ firstName: 'J' });
  });

  it('shows an inline error for an invalid email', async () => {
    render(<InfoFormWrapper data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'not-an-email');
    fireEvent.blur(emailInput);
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('keeps every typed character even when the parent never echoes the value back', async () => {
    // Simulates a parent whose server rejects intermediate values: `data` never
    // changes, so only the form's own local state can keep the input correct.
    render(<InfoForm data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    await userEvent.type(emailInput, 'juan@abc.com');
    expect(emailInput.value).toBe('juan@abc.com');
  });

  it('hides the logo field when the template does not render a logo', () => {
    render(<InfoFormWrapper data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} allowLogo={false} />);
    expect(screen.queryByLabelText('Company logo')).not.toBeInTheDocument();
  });

  it('calls onLogoUpload when a logo file is chosen', async () => {
    const onLogoUpload = vi.fn().mockResolvedValue(undefined);
    render(<InfoFormWrapper data={{}} onChange={vi.fn()} onLogoUpload={onLogoUpload} />);
    const file = new File(['bytes'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Company logo'), file);
    expect(onLogoUpload).toHaveBeenCalledWith(file);
  });

  it('shows no upload confirmation before a logo has been saved', () => {
    render(<InfoForm data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    expect(screen.queryByText(/logo uploaded/i)).not.toBeInTheDocument();
  });

  it('shows upload confirmation once the draft has a saved logo', () => {
    // The native file input always resets to "No file chosen" regardless of
    // outcome, so this confirmation — driven by the parent-confirmed
    // data.logoUrl, the way BuilderWizard's setDraft(await res.json()) sets
    // it after a successful upload — is the only real signal the upload
    // actually landed.
    render(<InfoForm data={{ logoUrl: '/uploads/logo.png' }} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    expect(screen.getByText(/logo uploaded/i)).toBeInTheDocument();
  });
});
