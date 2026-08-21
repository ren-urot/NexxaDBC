import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { InfoForm } from './InfoForm';

// Wrapper component that simulates parent behavior
function InfoFormWrapper(props: any) {
  const [data, setData] = useState(props.data || {});
  return (
    <InfoForm
      data={data}
      onChange={(patch) => {
        setData((prev) => ({ ...prev, ...patch }));
        props.onChange?.(patch);
      }}
      onLogoUpload={props.onLogoUpload}
    />
  );
}

describe('InfoForm', () => {
  it('renders all required and optional fields', () => {
    render(<InfoFormWrapper data={{}} onChange={vi.fn()} onLogoUpload={vi.fn()} />);
    for (const label of ['First name', 'Last name', 'Job title', 'Company', 'Mobile number', 'Email']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    for (const label of ['Website', 'Address', 'LinkedIn', 'Facebook', 'Instagram', 'WhatsApp', 'Messenger']) {
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

  it('calls onLogoUpload when a logo file is chosen', async () => {
    const onLogoUpload = vi.fn();
    render(<InfoFormWrapper data={{}} onChange={vi.fn()} onLogoUpload={onLogoUpload} />);
    const file = new File(['bytes'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Company logo'), file);
    expect(onLogoUpload).toHaveBeenCalledWith(file);
  });
});
