import { Mail, Phone } from 'lucide-react';
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor, whatsappUrl } from '@/lib/templates/style-utils';

const GRADIENT = 'linear-gradient(to right, #EF5425, #EF7D25, #EFB125, #F9A61B)';

export function SignatureHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#EF5425');
  return (
    <div
      className="flex h-[320px] w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div className="flex items-center px-6 py-5" style={{ background: accent }}>
        {data.logoUrl ? (
          <img
            src={data.logoUrl}
            alt={data.company ? `${data.company} logo` : 'Company logo'}
            className="h-9 max-w-[220px] object-contain"
          />
        ) : (
          data.company && (
            <p className={`${fontSizeClass(3, style.fontSizeStep)} font-bold text-white`}>{data.company}</p>
          )
        )}
      </div>
      <div className="h-1.5 w-full" style={{ background: GRADIENT }} />
      {/* Capped to keep contact details clear of the QR reserved in the
          bottom-right corner (see lib/templates/qr-spec.ts). */}
      <div className="flex flex-1 flex-col justify-center gap-2 max-w-[320px] px-6 py-6">
        <div>
          <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-bold text-gray-900`}>
            {data.firstName} {data.lastName}
          </h1>
          <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.jobTitle}</p>
        </div>
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center gap-2" style={{ color: accent }}>
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="text-gray-700">{data.mobile}</span>
          </p>
          <p className="flex items-center gap-2" style={{ color: accent }}>
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="text-gray-700">{data.email}</span>
          </p>
        </div>
        <div className="space-y-1.5 text-sm text-gray-500">
          {data.website && <p>{data.website}</p>}
          {data.address && <p>{data.address}</p>}
          <div className="flex gap-3 pt-2">
            {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
            {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
            {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
            {data.whatsapp && <a href={whatsappUrl(data.whatsapp)} aria-label="WhatsApp">WhatsApp</a>}
            {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
