import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import HomeButton from './HomeButton';

/** Cabeçalho das páginas internas: voltar + título + ações locais + "Visão Geral". */
export default function PageHeader({ module, title, subtitle, actions }) {
  const navigate = useNavigate();
  const Icon = module?.icon;

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="mb-5 flex items-center gap-3">
      <button
        onClick={goBack}
        aria-label="Voltar"
        className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {Icon && (
          <div className={`hidden shrink-0 rounded-lg bg-gradient-to-br p-1.5 sm:block ${module.gradient}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-white">{title ?? module?.title}</h1>
          {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <HomeButton />
      </div>
    </div>
  );
}
