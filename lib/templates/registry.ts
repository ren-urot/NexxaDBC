import type { TemplateDefinition, Orientation, TemplateCategory } from './types';

export const templates: TemplateDefinition[] = [];

export function filterTemplates(
  all: TemplateDefinition[],
  filter?: { orientation?: Orientation; category?: TemplateCategory }
): TemplateDefinition[] {
  return all.filter(
    t =>
      (!filter?.orientation || t.orientation === filter.orientation) &&
      (!filter?.category || t.category === filter.category)
  );
}

export function listTemplates(filter?: { orientation?: Orientation; category?: TemplateCategory }) {
  return filterTemplates(templates, filter);
}

export function getTemplate(id: string): TemplateDefinition {
  const found = templates.find(t => t.id === id);
  if (!found) throw new Error(`Unknown template: ${id}`);
  return found;
}
