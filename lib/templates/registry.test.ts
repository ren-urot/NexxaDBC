import { describe, it, expect } from 'vitest';
import { filterTemplates, templates } from './registry';
import type { TemplateDefinition } from './types';

const fixture = (overrides: Partial<TemplateDefinition>): TemplateDefinition => ({
  id: 'x',
  name: 'X',
  category: 'corporate',
  orientation: 'vertical',
  customizable: { accentColor: true, fontSizeStep: { min: -2, max: 2 }, logo: true },
  component: () => null,
  ...overrides,
});

describe('filterTemplates', () => {
  const all = [
    fixture({ id: 'a', category: 'corporate', orientation: 'vertical' }),
    fixture({ id: 'b', category: 'corporate', orientation: 'horizontal' }),
    fixture({ id: 'c', category: 'minimal', orientation: 'vertical' }),
  ];

  it('returns all templates with no filter', () => {
    expect(filterTemplates(all)).toHaveLength(3);
  });

  it('filters by orientation', () => {
    expect(filterTemplates(all, { orientation: 'vertical' }).map(t => t.id)).toEqual(['a', 'c']);
  });

  it('filters by category', () => {
    expect(filterTemplates(all, { category: 'corporate' }).map(t => t.id)).toEqual(['a', 'b']);
  });

  it('filters by both', () => {
    expect(filterTemplates(all, { category: 'corporate', orientation: 'horizontal' }).map(t => t.id)).toEqual(['b']);
  });
});

describe('templates (real registry)', () => {
  it('has exactly 10 templates covering both orientations', () => {
    expect(templates).toHaveLength(10);
    expect(templates.filter(t => t.orientation === 'vertical')).toHaveLength(5);
    expect(templates.filter(t => t.orientation === 'horizontal')).toHaveLength(5);
    expect(new Set(templates.map(t => t.id)).size).toBe(10);
  });
});
