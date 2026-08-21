'use client';

import type { TemplateDefinition, StyleOverrides } from '@/lib/templates/types';

interface CustomizePanelProps {
  template: TemplateDefinition;
  style: StyleOverrides;
  onChange: (patch: Partial<StyleOverrides>) => void;
}

export function CustomizePanel({ template, style, onChange }: CustomizePanelProps) {
  return (
    <div className="space-y-4">
      {template.customizable.accentColor && (
        <label>
          Accent color
          <input
            aria-label="Accent color"
            type="color"
            value={style.accentColor ?? '#000000'}
            onChange={e => onChange({ accentColor: e.target.value })}
          />
        </label>
      )}
      {template.customizable.fontSizeStep && (
        <label>
          Font size
          <input
            aria-label="Font size"
            type="range"
            min={template.customizable.fontSizeStep.min}
            max={template.customizable.fontSizeStep.max}
            value={style.fontSizeStep ?? 0}
            onChange={e => onChange({ fontSizeStep: Number(e.target.value) })}
          />
        </label>
      )}
    </div>
  );
}
