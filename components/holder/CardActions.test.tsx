import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardActions } from './CardActions';
import type { CardData } from '@/lib/templates/types';

const data: CardData = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+639171234567',
  email: 'juan@abc.com',
};

describe('CardActions', () => {
  it('renders Save to Contacts and Share buttons', () => {
    render(<CardActions data={data} />);
    expect(screen.getByRole('button', { name: /save to contacts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
  });

  it('triggers a vCard download when Save to Contacts is clicked', async () => {
    const user = userEvent.setup();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
    URL.revokeObjectURL = vi.fn();

    render(<CardActions data={data} />);
    await user.click(screen.getByRole('button', { name: /save to contacts/i }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('shares via the Web Share API when available', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });

    render(<CardActions data={data} />);
    await user.click(screen.getByRole('button', { name: /^share$/i }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Juan Dela Cruz' }));
  });

  it('falls back to copying the link when Web Share is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<CardActions data={data} />);
    await user.click(screen.getByRole('button', { name: /^share$/i }));

    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });
});
