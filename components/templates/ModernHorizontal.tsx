import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ModernHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#22d3ee');
  return (
    <div
      className="relative overflow-hidden flex flex-row w-[560px] h-[320px] rounded-2xl bg-gray-900 text-white p-6 gap-6 shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div
        className="absolute -bottom-16 -left-16 w-48 h-48 rotate-45"
        style={{ background: accent, opacity: 0.25 }}
      />
      <div className="flex-1 relative">
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-4" />}
        <h1 className={`${fontSizeClass(5, style.fontSizeStep)} font-black`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold`} style={{ color: accent }}>
          {data.jobTitle}
        </p>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-300`}>{data.company}</p>
      </div>
      <div className="flex-1 flex flex-col justify-center text-sm text-gray-300 space-y-1 relative">
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
