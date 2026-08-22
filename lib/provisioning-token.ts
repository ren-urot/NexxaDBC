export function isProvisioningTokenValid(order: {
  provisioningTokenStatus?: string | null;
  provisioningExpiresAt?: string | Date | null;
}): boolean {
  if (order.provisioningTokenStatus !== 'active') return false;
  if (!order.provisioningExpiresAt) return false;
  return new Date(order.provisioningExpiresAt).getTime() > Date.now();
}
