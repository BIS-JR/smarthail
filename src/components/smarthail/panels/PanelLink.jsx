import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Link "ver tudo" no rodapé de cada painel, na cor do módulo. */
export default function PanelLink({ module, children }) {
  return (
    <Link
      to={module.route}
      className={`group flex items-center justify-between rounded-xl border p-3 transition-all hover:brightness-125 ${module.soft} ${module.border}`}
    >
      <span className={`text-sm ${module.text}`}>{children}</span>
      <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${module.text}`} />
    </Link>
  );
}

export function PanelTitle({ module, children }) {
  return (
    <div className="text-center">
      <p className={`mb-1 text-xs font-semibold uppercase tracking-widest ${module.text}`}>{module.title}</p>
      <p className="text-sm text-slate-400">{children}</p>
    </div>
  );
}
