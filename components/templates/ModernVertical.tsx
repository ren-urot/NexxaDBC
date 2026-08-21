import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ModernVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#22d3ee');
  return (
    <div
      className="relative overflow-hidden w-[320px] h-[560px] rounded-2xl bg-gray-900 text-white p-6 shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div
        className="absolute -top-10 -right-16 w-48 h-48 rotate-45"
        style={{ background: accent, opacity: 0.25 }}
      />
      {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-6 relative" />}
      <h1 className={`${fontSizeClass(5, style.fontSizeStep)} font-black relative`}>
        {data.firstName}
        <br />
        {data.lastName}
      </h1>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold mt-2 relative`} style={{ color: accent }}>
        {data.jobTitle}
      </p>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-300 relative`}>{data.company}</p>
      <div className="mt-8 text-sm text-gray-300 space-y-1 relative">
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
