import { Mail, Phone } from 'lucide-react';
import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor, whatsappUrl } from '@/lib/templates/style-utils';

const GRADIENT = 'linear-gradient(to right, #EF5425, #EF7D25, #EFB125, #F9A61B)';

export function SignatureVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#EF5425');
  return (
    <div
      className="flex h-[560px] w-[320px] flex-col overflow-hidden rounded-3xl bg-white shadow-lg"
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
      {/* Top-anchored (not centered) so it can't drift down into the QR
          reserved in the bottom-right corner (see
          lib/templates/qr-spec.ts). */}
      <div className="flex flex-1 flex-col items-center gap-3 px-6 pt-8 text-center">
        <div>
          <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-bold text-gray-900`}>
            {data.firstName} {data.lastName}
          </h1>
          <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.jobTitle}</p>
        </div>
        <div className="space-y-1.5 text-sm text-gray-700">
          <p className="flex items-center justify-center gap-2" style={{ color: accent }}>
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="text-gray-700">{data.mobile}</span>
          </p>
          <p className="flex items-center justify-center gap-2" style={{ color: accent }}>
            <Mail className="h-3.5 w-3.5 shrink-0" />
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
