import { Sun, Cloud, CloudRain, CloudLightning, CloudSnow, CloudDrizzle, Wind, CloudFog, Snowflake, CloudSun, CloudHail } from 'lucide-react';

export const iconMap = {
  sunny: { icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  cloudy: { icon: Cloud, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  partly_cloudy: { icon: CloudSun, color: 'text-blue-300', bg: 'bg-blue-300/10' },
  rain: { icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  heavy_rain: { icon: CloudDrizzle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  storm: { icon: CloudLightning, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  hail: { icon: CloudHail, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  frost: { icon: Snowflake, color: 'text-cyan-300', bg: 'bg-cyan-300/10' },
  snow: { icon: CloudSnow, color: 'text-white', bg: 'bg-white/10' },
  fog: { icon: CloudFog, color: 'text-gray-300', bg: 'bg-gray-300/10' },
  windy: { icon: Wind, color: 'text-teal-400', bg: 'bg-teal-400/10' },
};

export const labelMap = {
  sunny: 'Ensolarado',
  cloudy: 'Nublado',
  partly_cloudy: 'Parcialmente nublado',
  rain: 'Chuva',
  heavy_rain: 'Chuva forte',
  storm: 'Tempestade',
  hail: 'Granizo',
  frost: 'Geada',
  snow: 'Neve',
  fog: 'Neblina',
  windy: 'Ventania',
};

export default function WeatherIcon({ condition, size = 'md', showLabel = true }) {
  const config = iconMap[condition] || iconMap.cloudy;
  const Icon = config.icon;
  const sizeClass = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
  const pad = size === 'sm' ? 'p-2 rounded-xl' : 'p-3 rounded-2xl';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${pad} ${config.bg}`}>
        <Icon className={`${sizeClass} ${config.color}`} />
      </div>
      {showLabel && size !== 'sm' && (
        <span className="mt-1 text-xs text-slate-400">{labelMap[condition] || condition}</span>
      )}
    </div>
  );
}
