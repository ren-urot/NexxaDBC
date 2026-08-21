import type { TemplateProps } from '@/lib/templates/types';
import { fontSizeClass, resolveAccentColor, whatsappUrl } from '@/lib/templates/style-utils';

export function MinimalHorizontal({ data, style }: TemplateProps) {
  const accent = resolveAccentColor(style, '#000000');
  return (
    <div className="w-[560px] h-[320px] bg-white p-8 flex flex-row items-center gap-8">
      <div className="flex-1">
        <h1 className={`${fontSizeClass(4, style.fontSizeStep)} font-light text-gray-900`}>
          {data.firstName} {data.lastName}
        </h1>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.jobTitle}</p>
        <p className={`${fontSizeClass(2, style.fontSizeStep)} text-gray-500`}>{data.company}</p>
      </div>
      <div data-testid="accent-divider" className="w-0.5 self-stretch" style={{ backgroundColor: accent }} />
      <div className="flex-1 text-sm text-gray-700 space-y-1">
        <p>{data.mobile}</p>
        <p>{data.email}</p>
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
  );
}
