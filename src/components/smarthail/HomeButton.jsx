import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';

export default function HomeButton() {
  return (
    <Link
      to="/"
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition-all hover:bg-white/10"
      title="Visão Geral"
    >
      <LayoutGrid className="h-4 w-4 text-blue-400" />
      <span className="text-xs font-medium text-slate-300">Visão Geral</span>
    </Link>
  );
}
