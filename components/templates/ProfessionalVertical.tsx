import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor } from '@/lib/templates/style-utils';

export function ProfessionalVertical({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#334155');
  return (
    <div
      className="flex flex-col items-center text-center w-[320px] h-[560px] rounded-2xl bg-slate-50 p-6 shadow-lg"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {data.logoUrl && <img src={data.logoUrl} alt={`${data.company} logo`} className="h-10 mb-4" />}
      <p className={`${fontSizeClass(2, style.fontSizeStep)} font-semibold uppercase tracking-wide`} style={{ color: accent }}>
        {data.jobTitle}
      </p>
      <h1 className={`${fontSizeClass(3, style.fontSizeStep)} font-medium text-slate-900 mt-1`}>
        {data.firstName} {data.lastName}
      </h1>
      <p className={`${fontSizeClass(2, style.fontSizeStep)} text-slate-600 mt-1`}>{data.company}</p>
      <div className="mt-6 text-sm text-slate-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
        {data.website && <p>{data.website}</p>}
        {data.address && <p>{data.address}</p>}
        <div className="flex justify-center gap-3 pt-2">
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
