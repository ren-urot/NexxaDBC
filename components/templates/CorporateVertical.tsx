import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function CorporateVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#1e3a8a');
  return (
    <div
      className="flex flex-col justify-between w-[320px] h-[560px] rounded-2xl bg-white p-6 shadow-lg border-t-8"
      style={{ '--accent': accent, borderTopColor: accent } as React.CSSProperties}
    >
      <div>
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-4" />}
        <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-bold text-gray-900`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-600`}>{data.jobTitle}</p>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold`} style={{ color: accent }}>
          {data.company}
        </p>
      </div>
      <div className="text-sm text-gray-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex gap-3 pt-2">
          {data.linkedin && <a href={data.linkedin} aria-label="LinkedIn">LinkedIn</a>}
          {data.facebook && <a href={data.facebook} aria-label="Facebook">Facebook</a>}
          {data.instagram && <a href={data.instagram} aria-label="Instagram">Instagram</a>}
          {data.whatsapp && <a href={data.whatsapp} aria-label="WhatsApp">WhatsApp</a>}
          {data.messenger && <a href={data.messenger} aria-label="Messenger">Messenger</a>}
        </div>
      </div>
    </div>
  );
}
