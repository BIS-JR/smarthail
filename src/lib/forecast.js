import { CloudRain, CloudHail, Snowflake } from 'lucide-react';

export const forecastTypeConfig = {
  rain: { icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', label: 'Chuva' },
  hail: { icon: CloudHail, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', label: 'Granizo' },
  frost: { icon: Snowflake, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20', label: 'Geada' },
};
