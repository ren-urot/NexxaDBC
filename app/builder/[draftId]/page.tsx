import { BuilderWizard } from '@/components/builder/BuilderWizard';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default async function BuilderPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:px-10">
        <BuilderWizard draftId={draftId} />
      </main>
      <SiteFooter />
    </>
  );
}
