import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LayoutTemplateIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function QrCodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" />
      <path d="M14 20h2M20 14v3M20 20h.01" />
    </svg>
  );
}

const FEATURES = [
  { icon: BoltIcon, title: 'No Installation', body: 'Works instantly in any browser.' },
  { icon: WalletIcon, title: 'One-Time Payment', body: 'Pay once. Use forever.' },
  { icon: SendIcon, title: 'Instant Transfer', body: 'Share your card in a tap.' },
];

const TRUST_STRIP = [
  { icon: LockIcon, title: 'Secure & Private', body: 'Your data is safe with us.' },
  { icon: BoltIcon, title: 'Instant Transfer', body: 'Scan. Transfer. Save.' },
  { icon: WalletIcon, title: 'One-Time Payment', body: 'No subscriptions. No hidden fees.' },
  { icon: ShieldCheckIcon, title: '100% Yours', body: 'Only pay once. Use forever.' },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    icon: LayoutTemplateIcon,
    title: 'Choose your template',
    body: 'Pick from twelve professionally designed layouts across six styles: corporate, minimal, modern, executive, creative, signature.',
  },
  {
    step: '2',
    icon: EditIcon,
    title: 'Fill in your details',
    body: 'Your name, title, contact info, logo, and socials. The live preview updates as you type.',
  },
  {
    step: '3',
    icon: QrCodeIcon,
    title: 'Pay once, get your QR',
    body: 'One payment, no subscription. Scan the code to add your card straight to your phone. No app required.',
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-x-hidden">
          {/* Decorations are clipped to the section's own bounds; the
              mockup image below deliberately is not, since it's
              positioned to bleed past the section's top edge. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 top-0 h-[640px] w-[640px] rounded-full bg-gradient-to-br from-tint to-scan/20 blur-2xl" />
            <div className="absolute right-10 top-24 grid grid-cols-8 gap-3 opacity-40">
              {Array.from({ length: 40 }).map((_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-scan" />
              ))}
            </div>
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="fade-up flex flex-col gap-6" style={{ marginTop: '-35px' }}>
              <span className="inline-flex w-fit items-center rounded-full bg-tint px-4 py-1.5 text-xs font-semibold text-scan">
                Smart. Professional. Paperless.
              </span>
              <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                <span className="text-scan">Next Generation</span>
                <br />
                <span className="text-ink">Business Card</span>
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-ink-soft">
                Create one digital business card and share it instantly with a single scan.
              </p>

              <ul className="mt-2 flex flex-col gap-4">
                {FEATURES.map(feature => (
                  <li key={feature.title} className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-scan">
                      <feature.icon />
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{feature.title}</p>
                      <p className="text-sm text-ink-soft">{feature.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/templates"
                  className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-scan px-7 py-3.5 font-medium text-white transition-colors hover:bg-scan-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
                >
                  Create Your Card
                  <ArrowRightIcon />
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-line px-7 py-3.5 font-medium text-ink transition-colors hover:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
                >
                  View Templates
                </Link>
              </div>
            </div>

            {/* Empty spacer cell — the mockup image is absolutely positioned
                against the section below, not this grid cell, since at 160%
                size it's wider than a fair column share and needs to extend
                toward the section's right edge without pushing into the
                text column's width. This cell just reserves that space so
                the text column doesn't stretch to fill it. */}
            <div className="hidden lg:block" aria-hidden />
          </div>

          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <div className="relative mx-auto h-full max-w-7xl px-6 sm:px-10">
              <p
                className="absolute z-10 -rotate-3 whitespace-nowrap font-script text-3xl leading-tight text-scan sm:text-4xl"
                style={{ top: 'calc(50% - 220px)', right: '146px' }}
              >
                Your card.
                <br />
                Anywhere.
              </p>
              <Image
                src="/phone-mockup.png"
                alt="The Nexxa DBC card shown on a phone screen and as a flat card, each with a QR code to scan"
                width={1075}
                height={800}
                priority
                className="pointer-events-auto absolute shrink-0"
                style={{
                  width: '748px',
                  height: 'auto',
                  maxWidth: 'none',
                  top: 'calc(50% - 0px)',
                  right: '-10px',
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:hidden">
            <div className="relative flex justify-center pb-8 pt-4">
              <p className="absolute -top-4 right-4 z-10 -rotate-3 whitespace-nowrap font-script text-3xl leading-tight text-scan">
                Your card.
                <br />
                Anywhere.
              </p>
              <Image
                src="/phone-mockup.png"
                alt="The Nexxa DBC card shown on a phone screen and as a flat card, each with a QR code to scan"
                width={1075}
                height={800}
                className="h-auto w-full max-w-[336px]"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8 sm:px-10">
          <div className="grid gap-8 rounded-3xl bg-white p-8 shadow-[0_2px_8px_rgba(23,23,23,0.05)] sm:grid-cols-4 sm:p-10">
            {TRUST_STRIP.map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-scan">
                  <item.icon />
                </span>
                <div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-sm text-ink-soft">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
          <div className="text-center">
            <span className="inline-flex w-fit items-center rounded-full bg-tint px-4 py-1.5 text-xs font-semibold text-scan">
              How It Works
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink">
              Three steps to your card
            </h2>
          </div>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="flex flex-col gap-3">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-tint text-scan">
                  <item.icon />
                  <span className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-scan font-display text-xs font-bold text-white">
                    {item.step}
                  </span>
                </span>
                <h3 className="font-display text-xl font-bold text-ink">{item.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-10">
          <div className="text-center">
            <span className="inline-flex w-fit items-center rounded-full bg-tint px-4 py-1.5 text-xs font-semibold text-scan">
              Pricing
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink">
              One price. No subscriptions.
            </h2>
          </div>
          <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-[0_2px_8px_rgba(23,23,23,0.05)]">
            <p className="font-display text-5xl font-extrabold text-ink">
              ₱499<span className="text-lg font-medium text-ink-soft"> one-time</span>
            </p>
            <ul className="mx-auto mt-6 flex max-w-xs flex-col gap-2 text-left text-sm text-ink-soft">
              <li>· Any of our 10 templates</li>
              <li>· Unlimited edits before checkout</li>
              <li>· Instant QR-based transfer to your phone</li>
              <li>· No app, no subscription, ever</li>
            </ul>
            <Link
              href="/templates"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-scan px-7 py-3.5 font-medium text-white transition-colors hover:bg-scan-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
            >
              Create Your Card
              <ArrowRightIcon />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
