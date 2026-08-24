'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getCards, type HolderCard } from '@/lib/holder-storage';

function MenuIcon() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
      <rect width="22" height="2" fill="#D9D9D9" />
      <rect y="7" width="22" height="2" fill="#D9D9D9" />
      <rect y="14" width="22" height="2" fill="#D9D9D9" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function cardLabel(card: HolderCard) {
  return `${card.data.firstName} ${card.data.lastName}`.trim() || 'Saved card';
}

// The closed holder — a still leather sleeve with just the top edge of the
// cards peeking out. Tapping it is what "opens" the case into the fanned
// browsing view, the same way you'd pull a physical card case out of a
// pocket before flipping it open.
function ClosedHolder({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open card holder"
      className="group relative mx-auto block w-full max-w-[392px] flex-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-scan"
    >
      <Image
        src="/holder/dbc-holder-closed.png"
        alt="Your card holder, closed"
        width={441}
        height={637}
        className="w-full transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0"
        priority
      />
      <p className="mt-4 text-center font-mono text-xs uppercase tracking-[0.18em] text-white/50">
        Tap to open
      </p>
    </button>
  );
}

const WINDOW_SIZE = 5;
const CASE_IMAGE = { width: 345, height: 491 };

// Exact per-slot text position, lifted directly from the reference design's
// own vector coordinates (not estimated from a screenshot) — top-of-text as
// a percent of the case image's height, index 0 = topmost slot (oldest
// card in the window) through index 4 = bottom slot (front/newest). The
// gaps between slots aren't even; the design fans the cards out slightly
// more toward the front one.
// Container is capped at 360px wide with a 345:491 aspect ratio (~512px
// tall), so 15px up is ~2.93% of that height.
const SLOT_TOP_PCT = [20.07, 29.52, 41.06, 54.1, 69.49];
const SLOT_HEIGHT_PCT = [12.67, 11.54, 13.04, 15.39, 18];
const SLOT_LEFT_PCT = 18;
const SLOT_RIGHT_PCT = 12;

function caseImageSrc(count: number) {
  return `/holder/${count}${count === 1 ? 'card' : 'cards'}.png`;
}

// The case itself: the actual reference photo for however many cards are
// in view (the art only exists for 1-5, which is exactly this window's
// size), with each card's name overlaid onto its own slot — the text is
// the only clickable thing on the photo, not the slot's whole area, since
// the photo itself is art, not UI. Browsing past 5 cards slides a new
// window into the same photo rather than trying to draw more slots than
// the case has. The photo's own magnifier pill, painted into its bottom
// rim, is where the search field actually lives.
function CardCase({
  cards,
  query,
  onQueryChange,
}: {
  cards: HolderCard[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [windowStart, setWindowStart] = useState(0);
  // A new search narrows (or widens) which cards are in play — always
  // start back at the newest match rather than leaving the window parked
  // wherever it happened to be for the previous query.
  useEffect(() => {
    setWindowStart(0);
  }, [query]);

  const maxStart = Math.max(0, cards.length - WINDOW_SIZE);
  const start = Math.min(windowStart, maxStart);
  const visible = cards.slice(start, start + WINDOW_SIZE); // index 0 = newest-in-window
  const count = Math.max(1, visible.length);
  const canBrowseUp = start > 0;
  const canBrowseDown = start < maxStart;

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${CASE_IMAGE.width} / ${CASE_IMAGE.height}` }}
      >
        <Image
          src={caseImageSrc(count)}
          alt={`Card holder open, showing ${count} card${count === 1 ? '' : 's'}`}
          fill
          sizes="360px"
          className="pointer-events-none select-none object-contain"
          priority
        />

        {visible.length === 0 && (
          <p className="pointer-events-none absolute inset-x-[10%] top-1/3 text-center text-sm text-white/40">
            No cards match &quot;{query}&quot;.
          </p>
        )}

        {visible.map((card, j) => {
          // The photo fills its tray top-to-bottom as cards are added, so
          // the newest card (index 0 here) sits in the bottom-most slot —
          // except the single-card photo, which (per the reference art)
          // draws its one card at slot 1, not slot 0; slot 0 there is
          // empty case interior, and text placed at slot 0's position would
          // sit right at the metal rim instead of on the card.
          const slotIndex = count === 1 ? 1 : count - 1 - j;
          return (
            <div
              key={card.id}
              className="pointer-events-none absolute flex flex-col justify-center text-left"
              style={{
                top: `${SLOT_TOP_PCT[slotIndex]}%`,
                height: `${SLOT_HEIGHT_PCT[slotIndex]}%`,
                left: `${SLOT_LEFT_PCT}%`,
                right: `${SLOT_RIGHT_PCT}%`,
              }}
            >
              <Link
                href={`/holder/${card.id}`}
                className="pointer-events-auto select-none leading-tight text-[#151517] hover:underline"
              >
                <span className="block text-sm font-semibold">{cardLabel(card)}</span>
                {card.data.jobTitle && <span className="block text-xs text-black/60">{card.data.jobTitle}</span>}
              </Link>
            </div>
          );
        })}

        {/* The pill is already painted into the bottom rim of the photo —
            this is a real search field sitting on top of it, not just a
            tappable region. */}
        <input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search cards"
          aria-label="Search cards"
          className="absolute select-none bg-transparent pl-[12px] pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none"
          style={{ left: '13.8%', right: '4%', bottom: '22px', height: '24px' }}
        />
      </div>

      {cards.length > WINDOW_SIZE && (
        <div className="absolute right-1 top-3 flex flex-col gap-2">
          <button
            type="button"
            aria-label="Browse newer cards"
            disabled={!canBrowseUp}
            onClick={() => setWindowStart(s => Math.max(0, s - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition-opacity disabled:opacity-25"
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            aria-label="Browse older cards"
            disabled={!canBrowseDown}
            onClick={() => setWindowStart(s => Math.min(maxStart, s + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition-opacity disabled:opacity-25"
          >
            <ChevronDownIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export default function HolderPage() {
  const router = useRouter();
  const [cards, setCards] = useState<HolderCard[] | null | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setCards(await getCards());
      } catch {
        setCards(null);
      }
    })();
  }, []);

  const empty = cards !== undefined && (!cards || cards.length === 0);

  // A card holder is only ever a consequence of receiving a DBC — it
  // doesn't exist as a thing you open up and then go find cards for. A
  // device with nothing saved has no holder to show, so this route isn't
  // where it belongs; send it to the site itself rather than rendering any
  // holder UI (sleeve, case, "no cards" message) that would imply one
  // exists.
  useEffect(() => {
    if (empty) {
      router.replace('/');
    }
  }, [empty, router]);

  if (cards === undefined || empty) {
    return (
      <main className="flex min-h-screen w-full flex-1 items-center justify-center bg-[#0b0b0c]">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/50">Loading…</p>
      </main>
    );
  }

  const filtered = cards.filter(c => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const name = `${c.data.firstName} ${c.data.lastName}`.toLowerCase();
    const company = (c.data.company ?? '').toLowerCase();
    return name.includes(q) || company.includes(q);
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-1 flex-col bg-[#0b0b0c] px-5 py-12">
      {isOpen ? (
        // The open case reads as its own screen — a back arrow to collapse
        // it again, title centered the way a detail screen's header is,
        // rather than the browsing entry point's left-aligned one below.
        <div className="mb-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close card holder"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
          >
            <BackArrowIcon />
          </button>
          <h1 className="flex-1 text-center font-display text-lg font-medium text-white">My Card Holder</h1>
          <div className="w-8 shrink-0" aria-hidden="true" />
        </div>
      ) : (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-6" aria-hidden="true">
              <MenuIcon />
            </div>
            <h1 className="mb-1 font-display text-2xl font-medium text-white">My Card Holder</h1>
            <p className="text-sm text-white/50">Browse your business cards</p>
          </div>
          <Link
            href="/holder/scan"
            aria-label="Scan Card"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#151517] text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
          >
            <ScanIcon />
          </Link>
        </div>
      )}

      {!isOpen ? (
        <ClosedHolder onOpen={() => setIsOpen(true)} />
      ) : (
        <div className="flex flex-1 flex-col">
          <CardCase cards={filtered} query={query} onQueryChange={setQuery} />
        </div>
      )}
    </main>
  );
}
