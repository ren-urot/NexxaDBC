import type { ComponentType } from 'react';

export interface CardData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  mobile: string;
  email: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  whatsapp?: string;
  messenger?: string;
}

export interface StyleOverrides {
  accentColor?: string;
  fontSizeStep?: number;
}

export type Orientation = 'vertical' | 'horizontal';

export type TemplateCategory =
  | 'corporate'
  | 'professional'
  | 'modern'
  | 'minimal'
  | 'executive'
  | 'creative';

export interface CustomizableFieldBounds {
  accentColor: boolean;
  fontSizeStep: { min: number; max: number } | false;
  logo: boolean;
}

export interface TemplateProps {
  data: CardData;
  style: StyleOverrides;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  orientation: Orientation;
  customizable: CustomizableFieldBounds;
  component: ComponentType<TemplateProps>;
}
