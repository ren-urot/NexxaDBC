'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/holder-sw.js', { scope: '/holder' }).catch(() => {
        // Offline support degrades gracefully without it — nothing to surface to the user.
      });
    }
  }, []);

  return null;
}
