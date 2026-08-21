import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function CreativeHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#ec4899');
  return (
    <div
      className="relative overflow-hidden w-[560px] h-[320px] rounded-3xl bg-white flex flex-row shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div
        className="w-[220px] h-full flex flex-col justify-center items-center p-6 text-white"
        style={{ background: accent, clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)' }}
      >
        {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-3" />}
        <h1 className={`${fontSizeClass(3, style.fontSizeStep)} font-bold text-center`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(1, style.fontSizeStep)} text-center`}>{data.jobTitle}</p>
      </div>
      <div className="flex-1 flex flex-col justify-center p-6 text-sm text-gray-700 space-y-1">
        <p className="font-semibold text-gray-900">{data.company}</p>
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
