import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/card-encoding', () => ({
  decodeCard: vi.fn(),
}));

vi.mock('@/lib/holder-storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/holder-storage')>('@/lib/holder-storage');
  return {
    // isSameCard is pure comparison logic, not storage I/O — keep the real
    // implementation so this test exercises the actual matching behavior,
    // and only mock the two functions that touch IndexedDB.
    isSameCard: actual.isSameCard,
    getCards: vi.fn(),
    saveCard: vi.fn(),
  };
});

import { useRouter } from 'next/navigation';
import { decodeCard } from '@/lib/card-encoding';
import { getCards, saveCard } from '@/lib/holder-storage';
import HolderInstallPage from './page';

const replace = vi.fn();

const sameCardPayload = {
  data: { firstName: 'Juan', lastName: 'Dela Cruz' } as never,
  style: {},
  templateId: 'corporate-vertical',
};
const storedCard = {
  id: 'card-1',
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
  it('redirects straight to the existing card when it is already in this device\'s card holder', async () => {
    vi.mocked(getCards).mockResolvedValue([storedCard]);
    vi.mocked(decodeCard).mockReturnValue(sameCardPayload);
    render(<HolderInstallPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder/card-1'));
    expect(saveCard).not.toHaveBeenCalled();
  });

  it('adds a different card alongside one this device already has', async () => {
    vi.mocked(getCards).mockResolvedValue([storedCard]);
    const differentPayload = {
      data: { firstName: 'Ana', lastName: 'Reyes' } as never,
      style: {},
      templateId: 'minimal-horizontal',
    };
    vi.mocked(decodeCard).mockReturnValue(differentPayload);
    vi.mocked(saveCard).mockResolvedValue({ id: 'card-2', ...differentPayload, savedAt: '2026-01-02T00:00:00.000Z' });
    render(<HolderInstallPage />);
    await waitFor(() => expect(saveCard).toHaveBeenCalledWith(differentPayload));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder/card-2'));
  });

  it('shows an invalid state for an undecodable fragment', async () => {
    vi.mocked(getCards).mockResolvedValue([]);
    vi.mocked(decodeCard).mockReturnValue(null);
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn.t valid/i);
  });

  it('saves a valid card and redirects to it when the card holder is empty', async () => {
    vi.mocked(getCards).mockResolvedValue([]);
    const payload = {
      data: { firstName: 'Juan' } as never,
      style: {},
      templateId: 'corporate-vertical',
    };
    vi.mocked(decodeCard).mockReturnValue(payload);
    vi.mocked(saveCard).mockResolvedValue({ id: 'new-card', ...payload, savedAt: '2026-01-01T00:00:00.000Z' });
    render(<HolderInstallPage />);
    await waitFor(() => expect(saveCard).toHaveBeenCalledWith(payload));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder/new-card'));
  });

  it('shows an error state when saving fails', async () => {
    vi.mocked(getCards).mockResolvedValue([]);
    vi.mocked(decodeCard).mockReturnValue({ data: {} as never, style: {}, templateId: 'corporate-vertical' });
    vi.mocked(saveCard).mockRejectedValue(new Error('quota exceeded'));
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });

  it('shows an error state when checking for existing cards fails', async () => {
    vi.mocked(getCards).mockRejectedValue(new Error('storage error'));
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });

  it('saves exactly once under React Strict Mode\'s double effect invocation', async () => {
    // Regression: Strict Mode runs the mount effect, its cleanup, then the
    // effect again. Both invocations used to read the same "not saved yet"
    // snapshot and each called saveCard, writing two near-identical records
    // for a single scan.
    vi.mocked(getCards).mockResolvedValue([]);
    const payload = {
      data: { firstName: 'Juan' } as never,
      style: {},
      templateId: 'corporate-vertical',
    };
    vi.mocked(decodeCard).mockReturnValue(payload);
    vi.mocked(saveCard).mockResolvedValue({ id: 'new-card', ...payload, savedAt: '2026-01-01T00:00:00.000Z' });
    render(
      <StrictMode>
        <HolderInstallPage />
      </StrictMode>
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder/new-card'));
    expect(saveCard).toHaveBeenCalledTimes(1);
  });
});
