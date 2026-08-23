import { RegisterServiceWorker } from '@/components/holder/RegisterServiceWorker';

export default function HolderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterServiceWorker />
      {children}
    </>
  );
}
