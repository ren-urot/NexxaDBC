import Link from 'next/link';
import Image from 'next/image';
import { NAV_LINKS } from './nav-links';

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <Image src="/nexxa-dbc-logo.png" alt="Nexxa DBC" width={304} height={69} className="h-7 w-auto" />
        <nav className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {NAV_LINKS.map(link => (
            <Link key={link.label} href={link.href} className="text-sm font-medium text-ink-soft hover:text-scan">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-ink-soft">© {new Date().getFullYear()} Nexxa DBC. All rights reserved.</p>
      </div>
    </footer>
  );
}
