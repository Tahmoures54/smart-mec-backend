import { ENAMAD_SEAL_HTML } from '@/lib/enamad';

export function EnamadSeal({ className }: { className?: string }) {
  return (
    <div
      className={['enamad-seal', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: ENAMAD_SEAL_HTML }}
    />
  );
}
