import { Mail, Phone } from 'lucide-react';
import type { TemplateProps } from '@/lib/templates/types';
import { companyNameStyle, fontSizeClass, resolveAccentColor, whatsappUrl } from '@/lib/templates/style-utils';

export function ProfessionalHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#334155');
  return (
    <div
      // The right column of padding (in place of a uniform p-6) shifts the
      // centered content left of the QR reserved in the bottom-right corner
      // (see lib/templates/qr-spec.ts) without abandoning the centered look.
      className="flex flex-col items-center justify-center text-center w-[560px] h-[320px] rounded-2xl bg-slate-50 py-6 pl-6 pr-[180px] shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {data.logoUrl && <img src={data.logoUrl} alt={data.company ? `${data.company} logo` : 'Company logo'} className="h-10 mb-3" />}
      {data.company && (
        <p className="font-semibold uppercase tracking-wide" style={{ color: accent, ...companyNameStyle(2, style.fontSizeStep) }}>
          {data.company}
        </p>
      )}
      <h1 className={`${fontSizeClass(3, style.fontSizeStep)} font-medium text-slate-900 mt-1`}>
        {data.firstName} {data.lastName}
      </h1>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-slate-600 mt-1`}>{data.jobTitle}</p>
      <div className="mt-4 flex max-w-[320px] flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-slate-700">
        <span className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {data.mobile}
        </span>
        <span className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {data.email}
        </span>
        {data.website && <span>{data.website}</span>}
      </div>
      {data.address && <p className="text-sm text-slate-700">{data.address}</p>}
      <div className="flex justify-center gap-3 pt-2">
        {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
        {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
        {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
        {data.whatsapp && <a href={whatsappUrl(data.whatsapp)} aria-label="WhatsApp">WhatsApp</a>}
        {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
      </div>
    </div>
  );
}
