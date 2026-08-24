'use client';

import { useEffect } from 'react';

/**
 * Earlier in development the holder service worker was registered without a
 * scope restriction, so on any browser that installed it back then it's
 * still active at scope "/" today — silently serving every route, including
 * pages like /templates that were never meant to go through it, straight
 * from its cache. A normal reload can't fix this: the service worker sits in
 * front of the network layer and intercepts the request before the browser's
 * HTTP cache (or a hard refresh) ever comes into play. This runs on every
 * page and removes any registration whose scope isn't confined to /holder,
 * leaving the real /holder-scoped one (registered by RegisterServiceWorker)
 * untouched.
 */
export function CleanupStaleServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        if (!new URL(registration.scope).pathname.startsWith('/holder')) {
          registration.unregister();
        }
      }
    });
  }, []);

  return null;
}
