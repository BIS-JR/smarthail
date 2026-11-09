import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api } from '@/api/client';
import AuthLayout, { Field, TextInput, PrimaryButton, LocalModeNote, FormError } from '@/components/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState(null);

  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token: t } = await api.auth.requestPasswordReset(email);
      setToken(t);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Enviaremos um link para o seu e-mail"
      footer={<Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300">Voltar ao login</Link>}
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-blue-400" />
          <p className="text-sm text-slate-300">
            Se existir uma conta com <span className="font-semibold text-white">{email}</span>, você receberá um link para criar uma nova senha.
          </p>
          {token && (
            <LocalModeNote>
              <Link to={`/reset-password?token=${token}`} className="font-semibold underline">Abrir link de redefinição</Link>
            </LocalModeNote>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail da conta">
            <TextInput type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <FormError>{error}</FormError>
          <PrimaryButton type="submit" loading={loading}>Enviar link</PrimaryButton>
        </form>
      )}
    </AuthLayout>
  );
}
