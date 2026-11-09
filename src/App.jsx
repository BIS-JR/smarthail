import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Spinner } from '@/components/ui/spinner';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import FeatureDetail from '@/pages/FeatureDetail';
import Dashboard from '@/pages/Dashboard';
import ClimateHistory from '@/pages/ClimateHistory';
import AlertsList from '@/pages/AlertsList';
import ForecastDetail from '@/pages/ForecastDetail';
import RiskMaps from '@/pages/RiskMaps';
import Insurance from '@/pages/Insurance';
import CoverAutomation from '@/pages/CoverAutomation';
import NotFound from '@/pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Chaves obrigatórias: no Chrome recente scrollTo() retorna uma Promise,
    // que o React tentaria executar como função de limpeza do efeito.
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/feature/:id" element={<FeatureDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/climate-history" element={<ClimateHistory />} />
        <Route path="/alerts-list" element={<AlertsList />} />
        <Route path="/forecast-detail" element={<ForecastDetail />} />
        <Route path="/risk-maps" element={<RiskMaps />} />
        <Route path="/insurance" element={<Insurance />} />
        <Route path="/cover-automation" element={<CoverAutomation />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </AuthProvider>
  );
}
