import Link from 'next/link';
import { PhoneFrame } from '@/components/builder/PhoneFrame';
import { getTemplate } from '@/lib/templates/registry';

const sampleCard = getTemplate('executive-vertical');
const SampleComponent = sampleCard.component;
const sampleData = {
  firstName: 'Amara',
  lastName: 'Reyes',
  jobTitle: 'Founder',
  company: 'Reyes & Co.',
  mobile: '+63 917 000 0000',
  email: 'amara@reyesandco.com',
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:px-10 sm:py-24">
        <header className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Digital Business Card · No. 001
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-[0.2em] text-ink-soft sm:inline">
            One purchase. No subscription.
          </span>
        </header>

        <section className="grid items-center gap-16 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="fade-up flex flex-col gap-8">
            <h1 className="font-display text-5xl leading-[1.05] font-medium tracking-tight text-ink sm:text-6xl">
              Your card,
              <br />
              proofed digitally
              <br />
              before it&apos;s real.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-ink-soft">
              Pick a template, fill in your details, and watch the proof update as you type. One
              design, one QR code, no app to install.
            </p>
            <div className="flex items-center gap-5">
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90"
              >
                Start your proof
                <span aria-hidden className="text-scan">→</span>
              </Link>
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
                Ten templates
              </span>
            </div>
          </div>

          <div
            className="fade-up flex justify-center sm:justify-end"
            style={{ animationDelay: '120ms' }}
          >
            <div style={{ transform: 'scale(0.86)' }}>
              <PhoneFrame orientation="vertical" label="Proof · Executive · vertical">
                <SampleComponent data={sampleData} style={{}} />
              </PhoneFrame>
            </div>
          </div>
        </section>

        <hr className="border-t border-line" />

        <section className="grid gap-10 sm:grid-cols-3">
          {[
            {
              mark: '01',
              title: 'Choose your stock',
              body: 'Ten templates across five houses — corporate, minimal, modern, executive, creative.',
            },
            {
              mark: '02',
              title: 'Fill in the plate',
              body: 'Your details, logo, and socials — the live proof updates as you type.',
            },
            {
              mark: '03',
              title: 'Scan it into being',
              body: 'One QR code transfers your card. No install, no subscription, ever.',
            },
          ].map(step => (
            <div key={step.mark} className="flex flex-col gap-2">
              <span className="font-mono text-xs text-scan">{step.mark}</span>
              <h2 className="font-display text-xl font-medium text-ink">{step.title}</h2>
              <p className="text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
