'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { listTemplates } from '@/lib/templates/registry';
import { CARD_QR_HORIZONTAL, CARD_QR_VERTICAL } from '@/lib/templates/qr-spec';
import type { Orientation, TemplateDefinition } from '@/lib/templates/types';

interface TemplateGalleryProps {
  onSelect: (templateId: string, orientation: Orientation) => void;
}

// Not a real transfer link — every finished card gets its own QR pointing at
// its own transfer URL (see app/holder/[cardId]/page.tsx). This one only
// shows where that QR will sit on the card face, so a corner that's actually
// spoken for doesn't read as unused blank space while picking a template.
const DUMMY_QR_VALUE = 'https://nexxadbc.vercel.app';

function TemplatePreview({ template }: { template: TemplateDefinition }) {
  const qrSpec = template.orientation === 'horizontal' ? CARD_QR_HORIZONTAL : CARD_QR_VERTICAL;
  return (
    <div className="relative">
      <template.component data={SAMPLE_DATA} style={{}} />
      <div
        className="absolute z-30 rounded-md bg-white p-1.5 shadow-md"
        style={{
          bottom: `${qrSpec.bottom}px`,
          ...('right' in qrSpec
            ? { right: `${qrSpec.right}px` }
            : { left: '50%', transform: 'translateX(-50%)' }),
        }}
      >
        <QRCodeSVG value={DUMMY_QR_VALUE} size={qrSpec.size} />
      </div>
    </div>
  );
}

const FILTERS: { label: string; value: Orientation | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Vertical', value: 'vertical' },
  { label: 'Horizontal', value: 'horizontal' },
];

const SAMPLE_DATA = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  jobTitle: 'Sales Director',
  company: 'ABC Corporation',
  mobile: '+63 917 123 4567',
  email: 'juan@abc.com',
};

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const [orientationFilter, setOrientationFilter] = useState<Orientation | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const templates = listTemplates(orientationFilter ? { orientation: orientationFilter } : undefined);
  const expandedTemplate = templates.find(t => t.id === expandedId);

  useEffect(() => {
    if (!expandedTemplate) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpandedId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedTemplate]);

  return (
    <div>
      <div className="mb-8 flex gap-1 border-b border-line">
        {FILTERS.map(f => {
          const active = f.value === orientationFilter;
          return (
            <button
              key={f.label}
              onClick={() => setOrientationFilter(f.value)}
              className={`-mb-px border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-colors ${
                active
                  ? 'border-scan text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
        {templates.map((t, i) => (
          <div key={t.id} className="group flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs text-scan">No. {String(i + 1).padStart(2, '0')}</span>
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
                {t.category} · {t.orientation}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpandedId(t.id)}
              aria-label={`View a larger preview of the ${t.name} ${t.orientation} template`}
              className="relative flex cursor-zoom-in justify-center overflow-hidden rounded-sm border border-line bg-stock/60 p-6 transition-colors hover:border-scan"
            >
              {/* `zoom` (unlike transform: scale) shrinks the layout box along
                  with the visuals, so this container doesn't leave a gap of
                  empty space sized to the card's unscaled dimensions. */}
              <div
                className="pointer-events-none"
                style={{ zoom: t.orientation === 'vertical' ? 0.55 : 0.4 }}
              >
                <TemplatePreview template={t} />
              </div>
            </button>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-medium text-ink">{t.name}</h3>
              <button
                onClick={() => onSelect(t.id, t.orientation)}
                className="font-mono text-xs uppercase tracking-[0.14em] text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-scan"
              >
                Select →
              </button>
            </div>
          </div>
        ))}
      </div>
      {expandedTemplate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${expandedTemplate.name} ${expandedTemplate.orientation} template preview`}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/70 p-6"
          onClick={() => setExpandedId(null)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpandedId(null)}
              aria-label="Close preview"
              className="absolute -top-10 right-0 font-mono text-xs uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white"
            >
              Close ✕
            </button>
            <div className="pointer-events-none overflow-hidden rounded-sm shadow-2xl">
              <TemplatePreview template={expandedTemplate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
