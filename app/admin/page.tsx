import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from '@/lib/admin-auth';

// Bare /admin has no page of its own — it's just the natural URL someone
// types looking for the admin area. Land them on orders if already signed
// in, login if not, instead of a generic 404.
export default async function AdminIndexPage() {
  const store = await cookies();
  const signedIn = isValidAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
  redirect(signedIn ? '/admin/orders' : '/admin/login');
}
