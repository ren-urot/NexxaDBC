import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor, whatsappUrl } from '@/lib/templates/style-utils';

const SKYLINE_BUILDINGS = [
  { x: 0, w: 22, h: 60 },
  { x: 24, w: 16, h: 100 },
  { x: 42, w: 26, h: 75 },
  { x: 70, w: 18, h: 130 },
  { x: 90, w: 14, h: 90 },
  { x: 106, w: 24, h: 150 },
  { x: 132, w: 16, h: 70 },
  { x: 150, w: 20, h: 110 },
];

function Skyline({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 170 160" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
      <rect width="170" height="160" fill="#e9eaec" />
      {SKYLINE_BUILDINGS.map((b, i) => (
        <rect key={i} x={b.x} y={160 - b.h} width={b.w} height={b.h} fill={i % 2 === 0 ? '#c7c9cd' : '#b3b6bb'} />
      ))}
      <rect x="0" y="150" width="170" height="10" fill={accent} opacity="0.85" />
    </svg>
  );
}

function IconBadge({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
      style={{ background: accent }}
    >
      {children}
    </span>
  );
}

function HomeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  );
}

export function SkylineHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#c0392b');
  return (
    <div
      className="relative flex h-[320px] w-[560px] overflow-hidden bg-white shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div
        className="absolute inset-y-0 z-10"
        style={{ left: '58%', width: '54px', background: accent, transform: 'skewX(-18deg)' }}
      />
      <div
        className="absolute bottom-0 left-0 z-10 h-0 w-0"
        style={{ borderRight: '90px solid transparent', borderBottom: '60px solid #1a2233' }}
      />
      <div className="relative z-20 flex w-[60%] flex-col justify-center gap-4 p-8">
        {data.logoUrl && (
          <img
            src={data.logoUrl}
            alt={data.company ? `${data.company} logo` : 'Company logo'}
            className="h-[52px] w-auto self-start"
          />
        )}
        <div>
          {data.company && <p className="text-sm text-gray-500">{data.company}</p>}
          <h1 className={`${fontSizeClass(3, style.fontSizeStep)} font-bold tracking-tight text-gray-900`}>
            {data.firstName.toUpperCase()} <span className="font-normal">{data.lastName.toUpperCase()}</span>
          </h1>
          <p className="font-medium" style={{ color: accent }}>
            {data.jobTitle}
          </p>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          {data.address && (
            <div className="flex items-center gap-2">
              <IconBadge accent={accent}>
                <HomeIcon />
              </IconBadge>
              <span>{data.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <IconBadge accent={accent}>
              <MailIcon />
            </IconBadge>
            <span>{data.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconBadge accent={accent}>
              <PhoneIcon />
            </IconBadge>
            <span>{data.mobile}</span>
          </div>
          {data.website && (
            <div className="flex items-center gap-2">
              <IconBadge accent={accent}>
                <GlobeIcon />
              </IconBadge>
              <span>{data.website}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1" style={{ color: accent }}>
            {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
            {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
            {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
            {data.whatsapp && <a href={whatsappUrl(data.whatsapp)} aria-label="WhatsApp">WhatsApp</a>}
            {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
          </div>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 w-[42%]">
        <Skyline accent={accent} />
      </div>
    </div>
  );
}
