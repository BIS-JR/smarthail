import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ClimateProvider } from '@/lib/ClimateContext';
import TopBar from '@/components/smarthail/TopBar';

/** Rotas protegidas: exige sessão, inicia a sincronização climática e aplica o TopBar fixo. */
export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <ClimateProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <TopBar />
        <main className="mx-auto max-w-3xl px-4 pb-10 pt-5">
          <Outlet />
        </main>
      </div>
    </ClimateProvider>
  );
}
