import { Link } from 'react-router-dom';
import { CloudOff } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
      <CloudOff className="mb-4 h-14 w-14 text-slate-600" />
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="mt-1 text-sm text-slate-400">O endereço acessado não existe no SMARTHAIL.</p>
      <Link to="/" className="mt-6 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
        Voltar ao início
      </Link>
    </div>
  );
}
