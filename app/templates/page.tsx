'use client';

import { useRouter } from 'next/navigation';
import { TemplateGallery } from '@/components/builder/TemplateGallery';

export default function TemplatesPage() {
  const router = useRouter();

  async function handleSelect(templateId: string, orientation: string) {
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId, orientation }),
    });
    const draft = await res.json();
    router.push(`/builder/${draft.id}`);
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Choose a template</h1>
      <TemplateGallery onSelect={handleSelect} />
    </main>
  );
}
