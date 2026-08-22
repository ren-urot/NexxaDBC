import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodSelector } from './PaymentMethodSelector';

describe('PaymentMethodSelector', () => {
  it('renders both payment method options', () => {
    render(<PaymentMethodSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /gcash/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /bank transfer/i })).toBeInTheDocument();
  });

  it('marks the selected method as checked', () => {
    render(<PaymentMethodSelector value="gcash" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /gcash/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /bank transfer/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked method', async () => {
    const onChange = vi.fn();
    render(<PaymentMethodSelector value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /bank transfer/i }));
    expect(onChange).toHaveBeenCalledWith('bank_transfer');
  });
});
