import { getTemplate } from '@/lib/templates/registry';
import { PhoneFrame } from './PhoneFrame';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

export function LivePreview({
  templateId,
  data,
  style,
}: {
  templateId: string;
  data: Partial<CardData>;
  style: StyleOverrides;
}) {
  const template = getTemplate(templateId);
  const Component = template.component;
  const previewData: CardData = {
    ...data,
    firstName: data.firstName || 'First Name',
    lastName: data.lastName || 'Last Name',
    jobTitle: data.jobTitle || 'Job Title',
    company: data.company || 'Company',
    mobile: data.mobile || '+63 900 000 0000',
    email: data.email || 'you@example.com',
  } as CardData;

  return (
    <PhoneFrame
      orientation={template.orientation}
      label={`Proof · ${template.name} · ${template.orientation}`}
    >
      <Component data={previewData} style={style} />
    </PhoneFrame>
  );
}
