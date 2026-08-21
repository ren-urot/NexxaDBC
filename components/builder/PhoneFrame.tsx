import type { Orientation } from '@/lib/templates/types';

export function PhoneFrame({ orientation, children }: { orientation: Orientation; children: React.ReactNode }) {
  return (
    <div
      className={`mx-auto rounded-[2rem] border-8 border-gray-800 bg-gray-800 p-2 ${
        orientation === 'vertical' ? 'w-[360px]' : 'w-[600px]'
      }`}
    >
      <div className="bg-white rounded-[1.5rem] overflow-hidden flex items-center justify-center p-4">{children}</div>
    </div>
  );
}
