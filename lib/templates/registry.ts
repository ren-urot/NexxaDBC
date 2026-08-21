import type { TemplateDefinition, Orientation, TemplateCategory } from './types';
import { CorporateVertical } from '@/components/templates/CorporateVertical';
import { CorporateHorizontal } from '@/components/templates/CorporateHorizontal';
import { ProfessionalVertical } from '@/components/templates/ProfessionalVertical';
import { ProfessionalHorizontal } from '@/components/templates/ProfessionalHorizontal';
import { ModernVertical } from '@/components/templates/ModernVertical';
import { ModernHorizontal } from '@/components/templates/ModernHorizontal';
import { MinimalVertical } from '@/components/templates/MinimalVertical';
import { MinimalHorizontal } from '@/components/templates/MinimalHorizontal';

export const templates: TemplateDefinition[] = [];

templates.push(
  {
    id: 'corporate-vertical',
    name: 'Corporate',
    category: 'corporate',
    orientation: 'vertical',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: CorporateVertical,
  },
  {
    id: 'corporate-horizontal',
    name: 'Corporate',
    category: 'corporate',
    orientation: 'horizontal',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: CorporateHorizontal,
  }
);

templates.push(
  {
    id: 'professional-vertical',
    name: 'Professional',
    category: 'professional',
    orientation: 'vertical',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: ProfessionalVertical,
  },
  {
    id: 'professional-horizontal',
    name: 'Professional',
    category: 'professional',
    orientation: 'horizontal',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: ProfessionalHorizontal,
  }
);

templates.push(
  {
    id: 'modern-vertical',
    name: 'Modern',
    category: 'modern',
    orientation: 'vertical',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: ModernVertical,
  },
  {
    id: 'modern-horizontal',
    name: 'Modern',
    category: 'modern',
    orientation: 'horizontal',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: true },
    component: ModernHorizontal,
  }
);

templates.push(
  {
    id: 'minimal-vertical',
    name: 'Minimal',
    category: 'minimal',
    orientation: 'vertical',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: false },
    component: MinimalVertical,
  },
  {
    id: 'minimal-horizontal',
    name: 'Minimal',
    category: 'minimal',
    orientation: 'horizontal',
    customizable: { accentColor: true, fontSizeStep: { min: -1, max: 1 }, logo: false },
    component: MinimalHorizontal,
  }
);

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
