import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout, { Field, TextInput, PrimaryButton, FormError } from '@/components/AuthLayout';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Nuvem: o link do e-mail abre uma sessão de recuperação; local: usa o token da URL
  const [canReset, setCanReset] = useState(api.mode === 'local' ? Boolean(token) : null);

  useEffect(() => {
    if (api.mode !== 'cloud') return;
    api.auth.hasRecoverySession().then(setCanReset);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      toast.success('Senha redefinida');
      navigate(api.mode === 'cloud' ? '/' : '/login', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Nova senha"
      subtitle="Escolha uma senha com letras e números"
      footer={<Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300">Voltar ao login</Link>}
    >
      {canReset === null ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : !canReset ? (
        <div className="space-y-4">
          <FormError>Link inválido ou expirado. Solicite uma nova redefinição de senha.</FormError>
          <Link to="/forgot-password" className="block text-center text-sm font-semibold text-blue-400 hover:text-blue-300">
            Pedir novo link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nova senha">
            <TextInput type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirmar nova senha">
            <TextInput type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <FormError>{error}</FormError>
          <PrimaryButton type="submit" loading={loading}>Salvar nova senha</PrimaryButton>
        </form>
      )}
    </AuthLayout>
  );
}
