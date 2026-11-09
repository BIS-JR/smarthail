import { useEffect, useState } from 'react';

export default function DateTimeHeader() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex flex-col items-start">
      <span className="font-mono text-xs uppercase tracking-wider text-blue-300/70">{date}</span>
      <span className="font-mono text-sm font-bold tracking-widest text-white">{time}</span>
    </div>
  );
}
