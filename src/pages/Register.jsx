import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import AuthLayout, { Field, TextInput, PrimaryButton, FormError, LocalModeNote } from '@/components/AuthLayout';

export default function Register() {
  const { confirmSignup, isAuthenticated, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && step === 1) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submitDetails = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      const res = await api.auth.startSignup(form);
      if (!res.needsCode) {
        // Confirmação por e-mail desativada: a conta já está ativa e logada
        await refresh();
        navigate('/', { replace: true });
        return;
      }
      setSentCode(res.code ?? '');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignup(form.email, code);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? 'Criar conta' : 'Verifique seu e-mail'}
      subtitle={step === 1 ? 'Etapa 1 de 2 · seus dados' : `Etapa 2 de 2 · código enviado para ${form.email}`}
      footer={<>Já tem conta? <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300">Entrar</Link></>}
    >
      {step === 1 ? (
        <form onSubmit={submitDetails} className="space-y-4">
          <Field label="Nome completo">
            <TextInput required autoComplete="name" value={form.fullName} onChange={set('fullName')} />
          </Field>
          <Field label="E-mail">
            <TextInput type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Senha (mín. 8 caracteres, letras e números)">
            <TextInput type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} />
          </Field>
          <Field label="Confirmar senha">
            <TextInput type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </Field>
          <FormError>{error}</FormError>
          <PrimaryButton type="submit" loading={loading}>Continuar</PrimaryButton>
        </form>
      ) : (
        <form onSubmit={submitCode} className="space-y-4">
          {sentCode ? (
            <LocalModeNote>
              Seu código de verificação é <span className="font-mono text-base font-bold tracking-widest">{sentCode}</span>
            </LocalModeNote>
          ) : (
            <p className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
              Enviamos um código de 6 dígitos para <span className="font-semibold">{form.email}</span>. Confira também a caixa de spam.
            </p>
          )}
          <Field label="Código de 6 dígitos">
            <TextInput
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono text-lg tracking-[0.5em]"
            />
          </Field>
          <FormError>{error}</FormError>
          <PrimaryButton type="submit" loading={loading}>Confirmar e entrar</PrimaryButton>
          <div className="flex justify-between gap-2">
            <button type="button" onClick={() => { setStep(1); setCode(''); setError(''); }} className="text-xs text-slate-400 hover:text-white">
              Voltar e corrigir dados
            </button>
            {!sentCode && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.auth.resendSignupCode(form.email);
                    toast.success('Código reenviado');
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Reenviar código
              </button>
            )}
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
