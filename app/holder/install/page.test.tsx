import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/card-encoding', () => ({
  decodeCard: vi.fn(),
}));

vi.mock('@/lib/holder-storage', () => ({
  getCard: vi.fn(),
  saveCard: vi.fn(),
}));

import { useRouter } from 'next/navigation';
import { decodeCard } from '@/lib/card-encoding';
import { getCard, saveCard } from '@/lib/holder-storage';
import HolderInstallPage from './page';

const replace = vi.fn();

const sameCardPayload = {
  data: { firstName: 'Juan', lastName: 'Dela Cruz' } as never,
  style: {},
  templateId: 'corporate-vertical',
};
const storedCard = {
  data: { firstName: 'Juan', lastName: 'Dela Cruz' } as never,
  style: {},
  templateId: 'corporate-vertical',
  savedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace } as never);
  window.location.hash = '';
});

describe('HolderInstallPage', () => {
  it('redirects straight to /holder when the same card is already saved on this device', async () => {
    vi.mocked(getCard).mockResolvedValue(storedCard);
    vi.mocked(decodeCard).mockReturnValue(sameCardPayload);
    render(<HolderInstallPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder'));
    expect(saveCard).not.toHaveBeenCalled();
  });

  it('processes and saves a different card when this device already has one saved', async () => {
    vi.mocked(getCard).mockResolvedValue(storedCard);
    const differentPayload = {
      data: { firstName: 'Ana', lastName: 'Reyes' } as never,
      style: {},
      templateId: 'minimal-horizontal',
    };
    vi.mocked(decodeCard).mockReturnValue(differentPayload);
    vi.mocked(saveCard).mockResolvedValue(undefined);
    render(<HolderInstallPage />);
    await waitFor(() => expect(saveCard).toHaveBeenCalledWith(differentPayload));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder'));
  });

  it('shows an invalid state for an undecodable fragment', async () => {
    vi.mocked(getCard).mockResolvedValue(null);
    vi.mocked(decodeCard).mockReturnValue(null);
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn.t valid/i);
  });

  it('saves a valid card and redirects to /holder when nothing is saved yet', async () => {
    vi.mocked(getCard).mockResolvedValue(null);
    const payload = {
      data: { firstName: 'Juan' } as never,
      style: {},
      templateId: 'corporate-vertical',
    };
    vi.mocked(decodeCard).mockReturnValue(payload);
    vi.mocked(saveCard).mockResolvedValue(undefined);
    render(<HolderInstallPage />);
    await waitFor(() => expect(saveCard).toHaveBeenCalledWith(payload));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder'));
  });

  it('shows an error state when saving fails', async () => {
    vi.mocked(getCard).mockResolvedValue(null);
    vi.mocked(decodeCard).mockReturnValue({ data: {} as never, style: {}, templateId: 'corporate-vertical' });
    vi.mocked(saveCard).mockRejectedValue(new Error('quota exceeded'));
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });

  it('shows an error state when checking for an existing card fails', async () => {
    vi.mocked(getCard).mockRejectedValue(new Error('storage error'));
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });
});
