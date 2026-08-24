import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor, whatsappUrl } from '@/lib/templates/style-utils';

const GRADIENT = 'linear-gradient(to right, #EF5425, #EF7D25, #EFB125, #F9A61B)';

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

export function SignatureVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#EF5425');
  return (
    <div
      className="flex w-[320px] flex-col overflow-hidden rounded-3xl bg-white shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div className="flex flex-col items-center justify-center gap-1 px-6 py-8 text-center" style={{ background: accent }}>
        {data.logoUrl ? (
          <img
            src={data.logoUrl}
            alt={data.company ? `${data.company} logo` : 'Company logo'}
            className="h-10 max-w-[200px] object-contain"
          />
        ) : (
          data.company && (
            <p className={`${fontSizeClass(3, style.fontSizeStep)} font-bold text-white`}>{data.company}</p>
          )
        )}
      </div>
      <div className="h-1.5 w-full" style={{ background: GRADIENT }} />
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <div>
          <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-bold text-gray-900`}>
            {data.firstName} {data.lastName}
          </h1>
          <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.jobTitle}</p>
        </div>
        <div className="space-y-1.5 text-sm text-gray-700">
          <p className="flex items-center justify-center gap-2" style={{ color: accent }}>
            <PhoneIcon />
            <span className="text-gray-700">{data.mobile}</span>
          </p>
          <p className="flex items-center justify-center gap-2" style={{ color: accent }}>
            <MailIcon />
            <span className="text-gray-700">{data.email}</span>
          </p>
          {data.website && <p className="text-gray-500">{data.website}</p>}
          {data.address && <p className="text-gray-500">{data.address}</p>}
        </div>
        <div className="flex gap-3 pt-2 text-sm">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={whatsappUrl(data.whatsapp)} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
