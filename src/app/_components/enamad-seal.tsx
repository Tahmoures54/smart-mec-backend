import { ENAMAD_SEAL_HTML } from '@/lib/enamad';

export function EnamadSeal({ className }: { className?: string }) {
  return (
    <div
      className={[
        'enamad-seal inline-flex h-[141px] w-[141px] shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title="نماد اعتماد الکترونیکی"
      aria-label="نماد اعتماد الکترونیکی"
      dangerouslySetInnerHTML={{ __html: ENAMAD_SEAL_HTML }}
    />
  );
}
