import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MODULES } from '@/lib/modules';
import HomeButton from '@/components/smarthail/HomeButton';
import ClimatePanel from '@/components/smarthail/panels/ClimatePanel';
import AlertsPanel from '@/components/smarthail/panels/AlertsPanel';
import ForecastPanel from '@/components/smarthail/panels/ForecastPanel';
import RiskMapPanel from '@/components/smarthail/panels/RiskMapPanel';
import InsurancePanel from '@/components/smarthail/panels/InsurancePanel';
import CoverPanel from '@/components/smarthail/panels/CoverPanel';

const PANELS = {
  climate: ClimatePanel,
  alerts: AlertsPanel,
  forecast: ForecastPanel,
  maps: RiskMapPanel,
  insurance: InsurancePanel,
  cover: CoverPanel,
};

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const SWIPE_THRESHOLD = 50;

export default function Dashboard() {
  const [[index, direction], setState] = useState([0, 0]);
  const touch = useRef(null);
  const tabsRef = useRef(null);
  const total = MODULES.length;

  const goTo = useCallback((next, dir) => {
    setState(([current]) => {
      const target = ((next % total) + total) % total; // navegação circular
      return [target, dir ?? (target > current ? 1 : -1)];
    });
  }, [total]);

  const next = useCallback(() => setState(([i]) => [(i + 1) % total, 1]), [total]);
  const prev = useCallback(() => setState(([i]) => [(i - 1 + total) % total, -1]), [total]);

  // Teclado: ← e →
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Mantém a aba ativa visível na barra rolável
  useEffect(() => {
    tabsRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  // Swipe (ignora gestos que começam dentro do mapa)
  const onTouchStart = (e) => {
    if (e.target.closest('.leaflet-container')) return (touch.current = null);
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, dy: 0 };
  };
  const onTouchMove = (e) => {
    if (!touch.current) return;
    touch.current.dx = e.touches[0].clientX - touch.current.x;
    touch.current.dy = e.touches[0].clientY - touch.current.y;
  };
  const onTouchEnd = () => {
    const t = touch.current;
    touch.current = null;
    if (!t || Math.abs(t.dx) < SWIPE_THRESHOLD || Math.abs(t.dx) < Math.abs(t.dy)) return;
    if (t.dx < 0) next(); // arrastar para a esquerda avança
    else prev();
  };

  const module = MODULES[index];
  const Panel = PANELS[module.id];

  return (
    <div className="space-y-4">
      {/* Barra de abas em pílula */}
      <div ref={tabsRef} className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        <HomeButton />
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          const active = i === index;
          return (
            <button
              key={m.id}
              data-index={i}
              onClick={() => goTo(i)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active ? m.activeTab : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? '' : m.text}`} />
              {m.tab}
            </button>
          );
        })}
      </div>

      {/* Carrossel */}
      <div className="relative" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <button
          onClick={prev}
          aria-label="Painel anterior"
          className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-slate-900/90 p-2 text-white shadow-lg transition hover:bg-slate-800 lg:-left-14 lg:block"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          aria-label="Próximo painel"
          className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-slate-900/90 p-2 text-white shadow-lg transition hover:bg-slate-800 lg:-right-14 lg:block"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="min-h-[460px] overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-5">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={module.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <Panel />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Setas (mobile) + dots */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={prev} aria-label="Painel anterior" className="rounded-full border border-white/10 bg-white/5 p-2 text-white lg:invisible">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {MODULES.map((m, i) => (
            <button
              key={m.id}
              onClick={() => goTo(i)}
              aria-label={`Ir para ${m.title}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-600 hover:bg-slate-500'}`}
            />
          ))}
        </div>
        <button onClick={next} aria-label="Próximo painel" className="rounded-full border border-white/10 bg-white/5 p-2 text-white lg:invisible">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
