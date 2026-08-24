import { Mail, Phone } from 'lucide-react';
import type { TemplateProps } from '@/lib/templates/types';
import { companyNameStyle, fontSizeClass, resolveAccentColor, whatsappUrl } from '@/lib/templates/style-utils';

export function MinimalHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#000000');
  return (
    <div className="w-[560px] h-[320px] bg-white p-8 flex flex-col justify-center">
      {/* Capped to keep contact details clear of the QR reserved in the
          bottom-right corner (see lib/templates/qr-spec.ts). */}
      <div className="max-w-[320px]">
        {data.company && (
          <p className="text-gray-500" style={companyNameStyle(2, style.fontSizeStep)}>{data.company}</p>
        )}
        <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-light text-gray-900`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.jobTitle}</p>
        <div data-testid="accent-divider" className="h-0.5 w-12 my-4" style={{ backgroundColor: accent }} />
        <div className="text-sm text-gray-700 space-y-1">
          <p className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {data.mobile}
          </p>
          <p className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {data.email}
          </p>
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
