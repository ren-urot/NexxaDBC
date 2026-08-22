import { describe, it, expect } from 'vitest';
import { isProvisioningTokenValid } from './provisioning-token';

describe('isProvisioningTokenValid', () => {
  it('is true when active and not yet expired', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isProvisioningTokenValid({ provisioningTokenStatus: 'active', provisioningExpiresAt: future })).toBe(true);
  });

  it('is false when the status is not active', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isProvisioningTokenValid({ provisioningTokenStatus: 'expired', provisioningExpiresAt: future })).toBe(false);
  });

  it('is false when active but past its expiry', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isProvisioningTokenValid({ provisioningTokenStatus: 'active', provisioningExpiresAt: past })).toBe(false);
  });

  it('is false when there is no expiry at all', () => {
    expect(isProvisioningTokenValid({ provisioningTokenStatus: 'active', provisioningExpiresAt: null })).toBe(false);
  });
});
