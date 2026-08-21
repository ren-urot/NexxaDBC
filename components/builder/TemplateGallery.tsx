'use client';

import { useState } from 'react';
import { listTemplates } from '@/lib/templates/registry';
import type { Orientation } from '@/lib/templates/types';

interface TemplateGalleryProps {
  onSelect: (templateId: string, orientation: Orientation) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const [orientationFilter, setOrientationFilter] = useState<Orientation | undefined>(undefined);
  const templates = listTemplates(orientationFilter ? { orientation: orientationFilter } : undefined);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setOrientationFilter(undefined)}>All</button>
        <button onClick={() => setOrientationFilter('vertical')}>Vertical</button>
        <button onClick={() => setOrientationFilter('horizontal')}>Horizontal</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="border rounded-lg p-4">
            <p className="font-medium">{t.name}</p>
            <p className="text-sm text-gray-500 capitalize">
              {t.category} · {t.orientation}
            </p>
            <button
              className="mt-2 px-3 py-1 bg-black text-white rounded"
              onClick={() => onSelect(t.id, t.orientation)}
            >
              Select
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
