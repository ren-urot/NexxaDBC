import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

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

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.6c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1.1L6.6 10.8Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.4 22H1.3l8.1-9.3L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 4H5.6l12.1 16Z" />
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

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Templates', href: '/templates' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

const FEATURES = [
  { icon: LockIcon, title: 'No App', body: 'No download required.' },
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
    title: 'Choose your template',
    body: 'Pick from ten professionally designed layouts across five styles — corporate, minimal, modern, executive, creative.',
  },
  {
    step: '2',
    title: 'Fill in your details',
    body: 'Your name, title, contact info, logo, and socials — the live preview updates as you type.',
  },
  {
    step: '3',
    title: 'Pay once, get your QR',
    body: 'One payment, no subscription. Scan the code to add your card straight to your phone — no app required.',
  },
];

function MockCardScreen({ variant }: { variant: 'phone' | 'flat' }) {
  return (
    <>
      <div className="bg-gradient-to-r from-scan to-orange-400 px-5 py-4">
        <p className="font-display text-lg font-extrabold text-white">
          Nexxa<span className="mx-1 font-normal opacity-60">|</span>DBC
        </p>
      </div>
      <div className={`bg-white ${variant === 'phone' ? 'px-5 py-6 text-center' : 'flex items-center justify-between gap-3 px-5 py-5'}`}>
        <div className={variant === 'flat' ? 'min-w-0' : ''}>
          <p className="truncate font-display text-lg font-bold text-ink">John Doe</p>
          <p className="mt-0.5 text-xs text-ink-soft">CEO</p>
          <div className={`mt-3 space-y-1.5 text-xs text-ink-soft ${variant === 'phone' ? '' : 'text-left'}`}>
            <p className={`flex items-center gap-1.5 truncate ${variant === 'phone' ? 'justify-center' : ''}`}>
              <span className="shrink-0 text-scan">
                <PhoneIcon />
              </span>
              +63 945 664 4706
            </p>
            <p className={`flex items-center gap-1.5 truncate ${variant === 'phone' ? 'justify-center' : ''}`}>
              <span className="shrink-0 text-scan">
                <MailIcon />
              </span>
              john@nexxadbc.com
            </p>
          </div>
        </div>
        {variant === 'flat' && (
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="rounded-md border border-line p-1">
              <QRCodeSVG value="https://nexxadbc.com" size={56} />
            </div>
            <p className="whitespace-nowrap font-mono text-[8px] text-ink-soft">nexxaDBC.com</p>
          </div>
        )}
      </div>
      {variant === 'phone' && (
        <div className="flex flex-col items-center gap-2 bg-white px-5 pb-6">
          <div className="rounded-md border border-line p-1.5">
            <QRCodeSVG value="https://nexxadbc.com" size={128} />
          </div>
          <p className="font-mono text-[10px] text-ink-soft">www.nexxaDBC.com</p>
        </div>
      )}
      <div className={`flex justify-center gap-3 bg-white pb-6 ${variant === 'flat' ? 'justify-start px-5 pb-5' : ''}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2]">
          <FacebookIcon />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
          <InstagramIcon />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black">
          <XIcon />
        </span>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" className="font-display text-xl font-extrabold tracking-tight text-scan">
            Nexxa<span className="mx-2 font-normal text-line">|</span>
            <span className="text-ink">DBC</span>
          </Link>
          <nav className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className={`font-medium text-sm ${
                  link.label === 'Home' ? 'border-b-2 border-scan pb-1 text-scan' : 'text-ink hover:text-scan'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/templates"
              className="rounded-full border border-scan px-5 py-2.5 text-sm font-medium text-scan transition-colors hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
            >
              View Templates
            </Link>
            <Link
              href="/templates"
              className="rounded-full bg-scan px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-scan-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 top-0 h-[640px] w-[640px] rounded-full bg-gradient-to-br from-tint to-scan/20 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-10 top-24 grid grid-cols-8 gap-3 opacity-40"
          >
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-scan" />
            ))}
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[1fr_1fr]">
            <div className="fade-up flex flex-col gap-6">
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
                  className="inline-flex items-center gap-2 rounded-full bg-scan px-7 py-3.5 font-medium text-white transition-colors hover:bg-scan-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
                >
                  Create Your Card
                  <ArrowRightIcon />
                </Link>
                <Link
                  href="/templates"
                  className="rounded-full border border-line px-7 py-3.5 font-medium text-ink transition-colors hover:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
                >
                  View Templates
                </Link>
              </div>
            </div>

            <div
              className="fade-up relative flex min-h-[520px] justify-center pb-16 pt-20 lg:justify-end lg:pr-10"
              style={{ animationDelay: '120ms' }}
            >
              <p className="absolute -top-14 right-0 z-10 -rotate-3 whitespace-nowrap font-script text-3xl leading-tight text-scan sm:right-2 sm:text-4xl">
                Your card.
                <br />
                Anywhere.
              </p>
              <div className="relative w-[280px] sm:w-[320px]">
                <div className="overflow-hidden rounded-[2.5rem] border-[10px] border-ink bg-ink shadow-[0_30px_60px_-20px_rgba(255,90,31,0.35)]">
                  <div className="flex items-center justify-between bg-ink px-5 pb-2 pt-3 font-sans text-[11px] font-semibold text-white">
                    <span>9:41</span>
                    <span className="flex items-center gap-1.5" aria-hidden>
                      <svg width="16" height="10" viewBox="0 0 16 10" fill="white">
                        <rect x="0" y="6" width="3" height="4" rx="0.5" />
                        <rect x="4.5" y="4" width="3" height="6" rx="0.5" />
                        <rect x="9" y="2" width="3" height="8" rx="0.5" />
                        <rect x="13.5" y="0" width="3" height="10" rx="0.5" opacity="0.5" />
                      </svg>
                      <svg width="16" height="12" viewBox="0 0 24 18" fill="white">
                        <path d="M12 15.5a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Zm5-5.4a7 7 0 0 0-10 0L5.6 8.7a9.5 9.5 0 0 1 12.8 0L17 10.1Zm3.6-3.6a11.6 11.6 0 0 0-17.2 0L2 5.1a14.6 14.6 0 0 1 20 0l-1.4 1.4Z" />
                      </svg>
                      <svg width="22" height="11" viewBox="0 0 24 12" fill="none">
                        <rect x="1" y="1" width="19" height="10" rx="2" stroke="white" strokeWidth="1.2" />
                        <rect x="2.5" y="2.5" width="16" height="7" rx="1" fill="white" />
                        <rect x="21" y="4" width="1.6" height="4" rx="0.8" fill="white" />
                      </svg>
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-t-2xl">
                    <MockCardScreen variant="phone" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-16 -right-6 w-[210px] overflow-hidden rounded-2xl shadow-[0_20px_45px_-15px_rgba(23,23,23,0.35)] sm:-right-10 sm:w-[240px]">
                <MockCardScreen variant="flat" />
              </div>
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
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-scan font-display text-lg font-bold text-white">
                  {item.step}
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
    </>
  );
}
