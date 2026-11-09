import { cn } from '@/lib/utils';

/** Spinner circular; passe a cor do módulo em `className` (ex.: border-sky-400). */
export function Spinner({ className, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-8 w-8 border-4' };
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn('animate-spin rounded-full border-blue-400 border-t-transparent', sizes[size], className)}
    />
  );
}

export function LoadingBlock({ className, spinner }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <Spinner className={spinner} />
    </div>
  );
}
