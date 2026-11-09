import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-blue-600/30">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-400">SMARTHAIL</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
      </motion.div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500',
        'outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30',
        className,
      )}
      {...props}
    />
  );
}

export function PrimaryButton({ loading, children, className, ...props }) {
  return (
    <button
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60',
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
      {children}
    </button>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{children}</p>;
}

export function LocalModeNote({ children }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <p className="mb-0.5 font-semibold">Modo local (sem servidor de e-mail)</p>
      {children}
    </div>
  );
}
