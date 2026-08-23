'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { NAV_LINKS } from './nav-links';

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center">
          <Image src="/nexxa-dbc-logo.png" alt="Nexxa DBC" width={304} height={69} priority className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map(link => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`font-medium text-sm ${
                  active ? 'border-b-2 border-scan pb-1 text-scan' : 'text-ink hover:text-scan'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/templates"
            className="inline-flex min-w-[160px] items-center justify-center rounded-full border border-scan px-5 py-2.5 text-sm font-medium text-scan transition-colors hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
          >
            View Templates
          </Link>
          <Link
            href="/templates"
            className="inline-flex min-w-[160px] items-center justify-center rounded-full bg-scan px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-scan-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
