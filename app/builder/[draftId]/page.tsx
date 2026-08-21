import { BuilderWizard } from '@/components/builder/BuilderWizard';

export default async function BuilderPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  return (
    <main className="max-w-6xl mx-auto p-8">
      <BuilderWizard draftId={draftId} />
    </main>
  );
}
