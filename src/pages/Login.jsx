import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import AuthLayout, { Field, TextInput, PrimaryButton, FormError } from '@/components/AuthLayout';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.2s2.7-6.2 6-6.2c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.66 0 9.4-3.98 9.4-9.58 0-.64-.07-1.13-.16-1.62z" />
    </svg>
  );
}

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Proteção climática inteligente para seu veículo"
      footer={<>Não tem conta? <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300">Criar conta</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail">
          <TextInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </Field>
        <Field label="Senha">
          <div className="relative">
            <TextInput
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">Esqueci minha senha</Link>
        </div>
        <FormError>{error}</FormError>
        <PrimaryButton type="submit" loading={loading}>Entrar</PrimaryButton>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" />
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!api.auth.supportsGoogle) {
              toast.info('Login com Google em breve', { description: 'Por enquanto, entre com e-mail e senha.' });
              return;
            }
            try {
              await api.auth.signInWithGoogle(); // redireciona para o Google
            } catch (err) {
              setError(err.message);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          <GoogleIcon /> Entrar com Google
        </button>
      </form>
    </AuthLayout>
  );
}
