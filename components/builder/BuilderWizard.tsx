'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoForm } from './InfoForm';
import { CustomizePanel } from './CustomizePanel';
import { LivePreview } from './LivePreview';
import { getTemplate } from '@/lib/templates/registry';
import type { CardData, StyleOverrides } from '@/lib/templates/types';

interface DraftState {
  id: string;
  templateId: string;
  status: string;
  styleOverrides: StyleOverrides;
  [key: string]: unknown;
}

export function BuilderWizard({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState | null>(null);

  useEffect(() => {
    fetch(`/api/drafts/${draftId}`)
      .then(r => r.json())
      .then(setDraft);
  }, [draftId]);

  if (!draft) return <p>Loading…</p>;
  if (draft.status === 'submitted') return <p>Your card has been submitted.</p>;

  const template = getTemplate(draft.templateId);
  const data = draft as unknown as Partial<CardData>;

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setDraft(await res.json());
  }

  async function handleLogoUpload(file: File) {
    const form = new FormData();
    form.set('file', file);
    const res = await fetch(`/api/drafts/${draftId}/logo`, { method: 'POST', body: form });
    setDraft(await res.json());
  }

  async function handleSubmit() {
    const res = await fetch(`/api/drafts/${draftId}/submit`, { method: 'POST' });
    setDraft(await res.json());
    router.push(`/builder/${draftId}/submitted`);
  }

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="space-y-8">
        <InfoForm data={data} onChange={patch} onLogoUpload={handleLogoUpload} />
        <CustomizePanel
          template={template}
          style={draft.styleOverrides}
          onChange={patch2 => patch({ styleOverrides: { ...draft.styleOverrides, ...patch2 } })}
        />
        <button onClick={handleSubmit}>Continue / Get My Digital Card</button>
      </div>
      <LivePreview templateId={draft.templateId} data={data} style={draft.styleOverrides} />
    </div>
  );
}
