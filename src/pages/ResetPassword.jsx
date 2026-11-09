import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import AuthLayout, { Field, TextInput, PrimaryButton, FormError } from '@/components/AuthLayout';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      toast.success('Senha redefinida', { description: 'Entre com sua nova senha.' });
      navigate('/login', { replace: true });
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
      {!token ? (
        <FormError>Link inválido. Solicite uma nova redefinição de senha.</FormError>
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
