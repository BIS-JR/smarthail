import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { MODULES } from '@/lib/modules';
import SyncStatus from '@/components/smarthail/SyncStatus';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Bem-vindo de volta{firstName && `, ${firstName}`} 👋</h1>
        <p className="mt-1 text-sm text-slate-400">Seu veículo está sendo monitorado 24/7</p>
      </div>

      <SyncStatus />

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <motion.div key={m.id} variants={item} className={m.large ? 'col-span-2' : ''}>
              <Link
                to={`/feature/${m.id}`}
                className="group relative flex h-full flex-col rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/[0.07] active:scale-95"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className={`rounded-xl bg-gradient-to-br p-2.5 shadow-lg ${m.gradient}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${m.text}`} />
                </div>
                <h2 className="text-sm font-bold text-white">{m.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{m.short}</p>
              </Link>
            </motion.div>
          );
        })}

        <motion.div variants={item} className="col-span-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-4 shadow-lg shadow-blue-600/20 transition-all hover:brightness-110 active:scale-95"
          >
            <div className="rounded-xl bg-white/15 p-2.5">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Painel Completo</p>
              <p className="text-xs text-blue-100">Acesse todos os módulos em um só lugar</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
