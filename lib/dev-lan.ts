import os from 'os';

/**
 * The machine's LAN-reachable IPv4 address, or null if none is found
 * (offline, VPN-only, etc). Used only to help a developer testing locally
 * reach the dev server from a phone on the same WiFi — a QR generated while
 * viewing the app at `localhost` encodes an address only this machine can
 * resolve, so a scan from any other device fails silently.
 */
export function getLanIPv4(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}
