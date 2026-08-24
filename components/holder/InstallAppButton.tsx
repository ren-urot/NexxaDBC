'use client';

import { useInstallPrompt } from '@/lib/use-install-prompt';

/**
 * The button that actually puts a Nexxa DBC icon on the phone's home
 * screen/desktop — distinct from "Saved to this phone" above (which only
 * means the card data is stored in this browser) and from "Save to
 * Contacts" (which exports a vCard, not an app). Scanning a QR transfers the
 * card itself instantly with no tap; this is a separate, entirely optional
 * affordance for anyone who also wants a home-screen icon — never something
 * the card transfer waits on or requires, since no browser will fire the
 * install prompt without a direct tap on a real button like this one.
 */
export function InstallAppButton() {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      onClick={promptInstall}
      className="flex items-center gap-3 rounded-full border border-line bg-white py-2 pl-2 pr-6 text-left transition-colors hover:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon" alt="" className="h-10 w-10 rounded-xl" />
      <span className="font-medium text-ink">Save DBC on Phone</span>
    </button>
  );
}
