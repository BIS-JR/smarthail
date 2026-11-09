import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Info, LogOut, HelpCircle, ShieldCheck, FlaskConical, Eraser, RefreshCw, Bell, BellOff } from 'lucide-react';
import { usePush } from '@/hooks/usePush';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { useClimate } from '@/lib/ClimateContext';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const menuSections = {
  about: {
    title: 'Sobre o Aplicativo',
    content: (
      <div className="space-y-4 text-sm text-slate-300">
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-400" />
          <div>
            <p className="text-lg font-bold text-white">SMARTHAIL</p>
            <p className="text-xs text-blue-400">Proteção Climática Automotiva</p>
          </div>
        </div>
        <p><span className="font-semibold text-white">Versão:</span> 1.1.0</p>
        <p><span className="font-semibold text-white">Última atualização:</span> 09/11/2026</p>
        <div className="border-t border-slate-700 pt-3">
          <p className="mb-2 font-semibold text-white">Novidades da v1.1.0:</p>
          <ul className="list-inside list-disc space-y-1 text-slate-400">
            <li>Contas na nuvem: seus dados em qualquer aparelho</li>
            <li>Notificações de alerta com o app fechado</li>
            <li>Indicador de granizo por instabilidade atmosférica</li>
            <li>Radar de chuva em tempo real no mapa</li>
            <li>Novo mapa base (OpenFreeMap)</li>
          </ul>
        </div>
        <p className="border-t border-slate-700 pt-3 text-xs text-slate-500">
          Dados meteorológicos: Open-Meteo.com (CC BY 4.0). Radar: RainViewer. Mapas: OpenFreeMap, © OpenMapTiles, © colaboradores do OpenStreetMap.
        </p>
      </div>
    ),
  },
  help: {
    title: 'Ajuda',
    content: (
      <div className="space-y-4 text-sm text-slate-300">
        {[
          ['🌤 Clima Local', 'Mostra condições climáticas atuais e histórico de até 60 horas na localização do veículo.'],
          ['⚠️ Alertas Climáticos', 'Lista alertas de granizo, tempestade, geada, vento e inundação, com filtros por período.'],
          ['📊 Previsões de Risco', 'Probabilidade, intensidade e janela de tempo para chuva, granizo e geada nas próximas 72h.'],
          ['🗺 Mapas de Risco', 'Trajeto georreferenciado com nível de exposição climática em cada ponto.'],
          ['🛡 Seguro Inteligente', 'Gera relatório com data, hora, coordenadas, intensidade do impacto e clima no momento do dano.'],
          ['⚙️ Automação da Capa', 'Infla e desinfla a capa, monitora magnetos, integridade e bateria.'],
        ].map(([title, text], i, arr) => (
          <div key={title} className={i < arr.length - 1 ? 'border-b border-slate-700 pb-3' : ''}>
            <p className="mb-1 font-semibold text-white">{title}</p>
            <p>{text}</p>
          </div>
        ))}
        <p className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
          Permita o acesso à localização no navegador para ver o clima exato onde você está.
          Sem permissão, o app usa São Paulo como referência.
        </p>
      </div>
    ),
  },
  product: {
    title: 'Sobre o Produto',
    content: (
      <div className="space-y-4 text-sm text-slate-300">
        <div className="mb-4 text-center">
          <ShieldCheck className="mx-auto mb-2 h-12 w-12 text-blue-400" />
          <p className="text-xl font-bold text-white">SMARTHAIL</p>
          <p className="text-blue-400">Sistema Inteligente de Proteção Veicular</p>
        </div>
        <p>
          O SMARTHAIL é uma plataforma completa de proteção climática automotiva que combina uma capa especial
          inteligente com monitoramento meteorológico avançado.
        </p>
        <div className="border-t border-slate-700 pt-3">
          <p className="mb-2 font-semibold text-white">Características:</p>
          <ul className="space-y-2">
            {[
              'Capa inflável com proteção multicamadas',
              'Magnetos de alta aderência para fixação',
              'Sensores de impacto integrados',
              'Monitoramento climático 24/7',
              'Acionamento automático em eventos extremos',
              'Integração direta com seguradoras',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-400">•</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
};

function MenuItem({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-slate-300 transition-all hover:bg-white/5 hover:text-white ${className}`}
    >
      <Icon className="h-5 w-5 text-blue-400" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const { user, logout } = useAuth();
  const { refresh, bump, syncing } = useClimate();
  const navigate = useNavigate();

  const openDialog = (key) => {
    setOpen(false);
    setDialog(key);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const handleDemo = async (add) => {
    setOpen(false);
    try {
      if (add) await api.climate.addDemoData();
      else await api.climate.clearDemoData();
      bump();
      toast.success(add ? 'Dados de demonstração adicionados' : 'Dados de demonstração removidos');
    } catch (e) {
      toast.error('Falha ao alterar dados de demonstração', { description: e.message });
    }
  };

  const push = usePush();
  const pushLabel = {
    enabled: 'Desativar notificações',
    disabled: 'Ativar notificações',
    denied: 'Notificações bloqueadas',
  }[push.status];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Abrir menu"
            className="rounded-lg border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10"
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Menu</SheetTitle>
          {user && <SheetDescription className="mt-1 truncate">{user.email}</SheetDescription>}
          <nav className="mt-6 flex flex-1 flex-col gap-1">
            <MenuItem icon={Info} label="Sobre o Aplicativo" onClick={() => openDialog('about')} />
            <MenuItem icon={HelpCircle} label="Ajuda" onClick={() => openDialog('help')} />
            <MenuItem icon={ShieldCheck} label="Sobre o Produto" onClick={() => openDialog('product')} />

            <div className="mt-4 border-t border-slate-700 pt-4">
              <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Dados</p>
              <MenuItem
                icon={RefreshCw}
                label={syncing ? 'Atualizando…' : 'Atualizar clima agora'}
                onClick={() => { setOpen(false); refresh(true); }}
              />
              {pushLabel && (
                <MenuItem
                  icon={push.status === 'enabled' ? BellOff : Bell}
                  label={push.busy ? 'Aguarde…' : pushLabel}
                  onClick={() => {
                    setOpen(false);
                    if (push.status === 'enabled') push.disable();
                    else if (push.status === 'disabled') push.enable();
                    else toast.info('Notificações bloqueadas', { description: 'Libere-as nas configurações do site no navegador.' });
                  }}
                />
              )}
              <MenuItem icon={FlaskConical} label="Adicionar demonstração" onClick={() => handleDemo(true)} />
              <MenuItem icon={Eraser} label="Remover demonstração" onClick={() => handleDemo(false)} />
            </div>

            <button
              onClick={handleLogout}
              className="mt-auto flex w-full items-center gap-3 rounded-lg border-t border-slate-700 px-4 py-3 pt-4 text-left text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">Sair</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog && menuSections[dialog]?.title}</DialogTitle>
          </DialogHeader>
          {dialog && menuSections[dialog]?.content}
        </DialogContent>
      </Dialog>
    </>
  );
}
