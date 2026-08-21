import { BuilderWizard } from '@/components/builder/BuilderWizard';

export default async function BuilderPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
      <BuilderWizard draftId={draftId} />
    </main>
  );
}
