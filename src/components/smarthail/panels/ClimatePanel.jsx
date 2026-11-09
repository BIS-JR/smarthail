import { Droplets, Wind, Gauge } from 'lucide-react';
import moment from 'moment';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { LoadingBlock } from '@/components/ui/spinner';
import WeatherIcon from '../WeatherIcon';
import PanelLink, { PanelTitle } from './PanelLink';

const module = getModule('climate');

export default function ClimatePanel() {
  const { data, loading } = useEntityList('WeatherData', '-timestamp', 1);
  const weather = data[0];

  if (loading) return <LoadingBlock className="h-64" spinner={module.spinner} />;
  if (!weather) return <div className="py-12 text-center text-slate-400">Sem dados climáticos disponíveis</div>;

  const stats = [
    { icon: Droplets, color: 'text-blue-400', label: 'Umidade', value: `${weather.humidity}%` },
    { icon: Wind, color: 'text-teal-400', label: 'Vento', value: `${weather.wind_speed} km/h` },
    { icon: Gauge, color: 'text-purple-400', label: 'Pressão', value: `${weather.pressure} hPa` },
  ];

  return (
    <div className="space-y-4">
      <PanelTitle module={module}>{weather.location_name}</PanelTitle>

      <div className="flex items-center justify-center gap-6">
        <WeatherIcon condition={weather.condition} size="lg" />
        <div className="text-center">
          <p className="text-5xl font-extralight text-white">{Math.round(weather.temperature)}°</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-blue-400">↓ {weather.temp_min}°</span>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-orange-400">↑ {weather.temp_max}°</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
            <Icon className={`mx-auto mb-1 h-4 w-4 ${color}`} />
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-500">Leitura de {moment(weather.timestamp).format('DD/MM HH:mm')}</p>

      <PanelLink module={module}>Ver histórico 60 horas</PanelLink>
    </div>
  );
}
