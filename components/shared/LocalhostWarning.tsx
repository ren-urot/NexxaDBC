'use client';

import { useEffect, useState } from 'react';

/**
 * Warns when this page — one that's about to show a QR code — is being
 * viewed at `localhost`. A QR encodes `window.location.origin`, and
 * `localhost` only resolves on this machine, so a scan from a phone (even
 * on the same WiFi) fails with no indication why. Offers a one-click link
 * to the same page at this dev server's actual LAN address instead.
 */
export function LocalhostWarning() {
  const [lanUrl, setLanUrl] = useState<string | null>(null);

  useEffect(() => {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocalhost) return;

    (async () => {
      try {
        const res = await fetch('/api/dev/lan-origin');
        if (!res.ok) return;
        const { origin } = await res.json();
        if (origin) {
          setLanUrl(origin + window.location.pathname + window.location.search + window.location.hash);
        }
      } catch {
        // No LAN address to offer — say nothing rather than show a broken link.
      }
    })();
  }, []);

  if (!lanUrl) return null;

  return (
    <p role="alert" className="rounded-sm border border-ink/20 bg-stock px-4 py-3 text-sm text-ink">
      This page is at <code className="font-mono">localhost</code>, which only your computer can reach — a QR code
      generated here won&apos;t scan from a phone. Open{' '}
      <a href={lanUrl} className="underline decoration-line underline-offset-4 hover:decoration-scan">
        {lanUrl}
      </a>{' '}
      instead so your phone (on the same WiFi) can reach it.
    </p>
  );
}
