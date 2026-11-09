import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronRight, SearchX } from 'lucide-react';
import { getModule } from '@/lib/modules';
import PageHeader from '@/components/smarthail/PageHeader';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function FeatureDetail() {
  const { id } = useParams();
  const m = getModule(id);

  if (!m) {
    return (
      <div className="py-20 text-center">
        <SearchX className="mx-auto mb-4 h-12 w-12 text-slate-600" />
        <h1 className="text-lg font-bold text-white">Funcionalidade não encontrada</h1>
        <p className="mt-1 text-sm text-slate-400">O módulo solicitado não existe.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const Icon = m.icon;

  return (
    <div>
      <PageHeader title="Sobre o módulo" />

      <motion.div {...fadeUp(0)} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 ${m.gradient}`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="mb-4 inline-flex rounded-2xl bg-white/15 p-3">
            <Icon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{m.title}</h1>
          <p className="mt-1 text-sm text-white/80">{m.subtitle}</p>
        </div>
      </motion.div>

      <motion.p {...fadeUp(0.1)} className="mt-5 text-sm leading-relaxed text-slate-300">
        {m.description}
      </motion.p>

      <motion.div {...fadeUp(0.18)} className="mt-5 grid grid-cols-3 gap-2">
        {m.benefits.map(({ icon: BIcon, text }) => (
          <div key={text} className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
            <BIcon className={`mx-auto mb-1.5 h-5 w-5 ${m.text}`} />
            <p className="text-[11px] leading-tight text-slate-300">{text}</p>
          </div>
        ))}
      </motion.div>

      <motion.div {...fadeUp(0.24)} className="mt-5 rounded-2xl border border-white/5 bg-white/5 p-4">
        <h2 className="mb-3 text-sm font-bold text-white">O que está incluído</h2>
        <ul className="space-y-2.5">
          {m.includes.map((inc) => (
            <li key={inc} className="flex items-start gap-2.5 text-sm text-slate-300">
              <span className={`mt-0.5 rounded-full p-0.5 ${m.soft}`}>
                <Check className={`h-3 w-3 ${m.text}`} />
              </span>
              {inc}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div {...fadeUp(0.35)} className="mt-6">
        <Link
          to={m.route}
          className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r py-4 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 ${m.gradient}`}
        >
          {m.cta}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  );
}
