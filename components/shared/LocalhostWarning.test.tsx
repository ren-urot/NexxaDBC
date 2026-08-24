import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LocalhostWarning } from './LocalhostWarning';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LocalhostWarning', () => {
  it('shows a link to the LAN origin when viewed at localhost and one is available', async () => {
    // jsdom's default test URL is http://localhost:3000/ — no override needed.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ origin: 'http://192.168.1.9:3000' }) })
    );

    render(<LocalhostWarning />);

    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'http://192.168.1.9:3000/');
    });
  });

  it('renders nothing when no LAN origin is available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ origin: null }) }));

    const { container } = render(<LocalhostWarning />);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the lookup request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { container } = render(<LocalhostWarning />);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('never calls fetch when not viewed at localhost', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: new URL('http://192.168.1.9:3000/checkout/order-1/status'),
      configurable: true,
    });
    vi.stubGlobal('fetch', vi.fn());

    const { container } = render(<LocalhostWarning />);

    // Give any (incorrect) async fetch a tick to have fired before asserting.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetch).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();

    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
  });
});
