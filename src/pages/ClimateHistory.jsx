import moment from 'moment';
import { Droplets, Wind, Gauge, Thermometer } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { LoadingBlock } from '@/components/ui/spinner';
import PageHeader from '@/components/smarthail/PageHeader';
import WeatherIcon, { labelMap } from '@/components/smarthail/WeatherIcon';

const module = getModule('climate');

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">{moment(p.timestamp).format('DD/MM HH:mm')}</p>
      <p className="font-semibold text-white">{p.temperature}°C · {labelMap[p.condition]}</p>
    </div>
  );
}

export default function ClimateHistory() {
  const { data: readings, loading } = useEntityList('WeatherData', '-timestamp', 60);
  const list = readings.slice(0, 50);
  const chartData = [...readings].reverse();

  return (
    <div>
      <PageHeader module={module} subtitle={readings[0]?.location_name ?? 'Últimas 60 horas'} />

      {loading ? (
        <LoadingBlock spinner={module.spinner} />
      ) : readings.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Nenhuma leitura climática registrada ainda.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">Temperatura nas últimas 60h</h2>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) => moment(t).format('HH[h]')}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v)}°`} domain={[(min) => Math.floor(min - 2), (max) => Math.ceil(max + 2)]} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#334155' }} />
                  <Area type="monotone" dataKey="temperature" stroke="#38bdf8" strokeWidth={2} fill="url(#tempFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="px-1 text-xs text-slate-500">{list.length} leituras mais recentes</p>

          {list.map((w, i) => (
            <div key={w.id} className={`rounded-2xl border p-4 ${i === 0 ? 'border-sky-500/30 bg-sky-500/5' : 'border-white/5 bg-white/5'}`}>
              <div className="flex items-center gap-4">
                <WeatherIcon condition={w.condition} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {labelMap[w.condition] ?? w.condition}
                    {i === 0 && <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300">Agora</span>}
                  </p>
                  <p className="text-xs text-slate-400">{moment(w.timestamp).format('ddd, DD/MM · HH:mm')}</p>
                </div>
                <p className="text-3xl font-extralight text-white">{Math.round(w.temperature)}°</p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/5 pt-3 text-center">
                <div>
                  <p className="text-[10px] text-slate-500">Mín/Máx</p>
                  <p className="text-xs font-medium text-white">{Math.round(w.temp_min)}° / {Math.round(w.temp_max)}°</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500"><Droplets className="h-3 w-3" />Umidade</p>
                  <p className="text-xs font-medium text-white">{w.humidity}%</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500"><Wind className="h-3 w-3" />Vento</p>
                  <p className="text-xs font-medium text-white">{w.wind_speed} km/h</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500"><Gauge className="h-3 w-3" />Pressão</p>
                  <p className="text-xs font-medium text-white">{w.pressure} hPa</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
