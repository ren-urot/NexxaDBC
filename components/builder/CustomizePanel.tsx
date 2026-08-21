'use client';

import type { TemplateDefinition, StyleOverrides } from '@/lib/templates/types';

interface CustomizePanelProps {
  template: TemplateDefinition;
  style: StyleOverrides;
  onChange: (patch: Partial<StyleOverrides>) => void;
}

export function CustomizePanel({ template, style, onChange }: CustomizePanelProps) {
  if (!template.customizable.accentColor && !template.customizable.fontSizeStep) return null;

  return (
    <fieldset className="space-y-5">
      <legend className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
        Customize — the finish
      </legend>
      <div className="flex flex-wrap items-end gap-8">
        {template.customizable.accentColor && (
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              Accent color
            </span>
            <input
              aria-label="Accent color"
              type="color"
              value={style.accentColor ?? '#000000'}
              onChange={e => onChange({ accentColor: e.target.value })}
              className="h-9 w-9 cursor-pointer rounded-full border border-line bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0"
            />
          </label>
        )}
        {template.customizable.fontSizeStep && (
          <label className="flex flex-1 min-w-[160px] flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              Font size
            </span>
            <input
              aria-label="Font size"
              type="range"
              min={template.customizable.fontSizeStep.min}
              max={template.customizable.fontSizeStep.max}
              value={style.fontSizeStep ?? 0}
              onChange={e => onChange({ fontSizeStep: Number(e.target.value) })}
              className="accent-scan"
            />
          </label>
        )}
      </div>
    </fieldset>
  );
}
