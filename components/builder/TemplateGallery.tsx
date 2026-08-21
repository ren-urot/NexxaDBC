'use client';

import { useState } from 'react';
import { listTemplates } from '@/lib/templates/registry';
import type { Orientation } from '@/lib/templates/types';

interface TemplateGalleryProps {
  onSelect: (templateId: string, orientation: Orientation) => void;
}

const FILTERS: { label: string; value: Orientation | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Vertical', value: 'vertical' },
  { label: 'Horizontal', value: 'horizontal' },
];

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const [orientationFilter, setOrientationFilter] = useState<Orientation | undefined>(undefined);
  const templates = listTemplates(orientationFilter ? { orientation: orientationFilter } : undefined);

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
            <div className="relative flex justify-center overflow-hidden rounded-sm border border-line bg-stock/60 p-6">
              {/* `zoom` (unlike transform: scale) shrinks the layout box along
                  with the visuals, so this container doesn't leave a gap of
                  empty space sized to the card's unscaled dimensions. */}
              <div
                className="pointer-events-none"
                style={{ zoom: t.orientation === 'vertical' ? 0.55 : 0.4 }}
              >
                <t.component
                  data={{
                    firstName: 'Juan',
                    lastName: 'Dela Cruz',
                    jobTitle: 'Sales Director',
                    company: 'ABC Corporation',
                    mobile: '+63 917 123 4567',
                    email: 'juan@abc.com',
                  }}
                  style={{}}
                />
              </div>
            </div>
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
    </div>
  );
}
