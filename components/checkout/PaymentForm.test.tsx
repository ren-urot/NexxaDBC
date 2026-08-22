import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from './PaymentForm';

describe('PaymentForm', () => {
  it('rejects submission with no reference or file', async () => {
    const onSubmit = vi.fn();
    render(<PaymentForm method="gcash" onSubmit={onSubmit} submitting={false} />);
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onSubmit with the reference and file when both are provided', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PaymentForm method="gcash" onSubmit={onSubmit} submitting={false} />);

    await userEvent.type(screen.getByLabelText(/reference/i), 'REF123');
    const file = new File(['bytes'], 'proof.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText(/screenshot/i), file);
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));

    expect(onSubmit).toHaveBeenCalledWith({ reference: 'REF123', file });
  });

  it('disables the submit button while submitting', () => {
    render(<PaymentForm method="gcash" onSubmit={vi.fn()} submitting={true} />);
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
  });
});
