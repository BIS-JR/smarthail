/**
 * Autenticação — substitui `base44.auth.*`.
 *
 * Nuvem (Supabase Auth): contas reais, e-mail com código de verificação,
 * redefinição de senha por link e login com Google (se habilitado).
 *
 * Local (fallback sem backend): usuários no localStorage com senha em
 * SHA-256 + salt; código e link de redefinição exibidos na própria tela.
 */
import { supabase, isCloud } from './supabase';
import { readJSON, writeJSON, uid, SESSION_KEY, PREFIX } from './store';

const normalize = (email) => email.trim().toLowerCase();
const appUrl = (path = '') => `${window.location.origin}${import.meta.env.BASE_URL}${path}`;

export function validatePassword(password) {
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return null;
}

// ---------------------------------------------------------------------------
// Nuvem (Supabase)
// ---------------------------------------------------------------------------

const ERROR_MESSAGES = [
  [/invalid login credentials/i, 'E-mail ou senha inválidos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Use o código que enviamos no cadastro.'],
  [/already registered|already been registered/i, 'Já existe uma conta com este e-mail.'],
  [/token has expired|otp.*expired|invalid.*token|token.*invalid/i, 'Código incorreto ou expirado.'],
  [/rate limit|too many|security purposes/i, 'Muitas tentativas. Aguarde um minuto e tente novamente.'],
  [/weak_password|password.*(weak|short|character)/i, 'Senha fraca: use pelo menos 8 caracteres, com letras e números.'],
  [/provider is not enabled/i, 'Login com Google ainda não está habilitado.'],
];

function translate(error) {
  const msg = error?.message ?? String(error);
  const found = ERROR_MESSAGES.find(([re]) => re.test(msg));
  return new Error(found ? found[1] : msg);
}

function toAppUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: 'user',
    created_date: user.created_at,
  };
}

const cloudAuth = {
  mode: 'cloud',
  supportsGoogle: import.meta.env.VITE_GOOGLE_AUTH === 'true',

  async me() {
    const { data } = await supabase.auth.getSession();
    return toAppUser(data.session?.user);
  },

  onChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, toAppUser(session?.user)));
    return () => data.subscription.unsubscribe();
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalize(email), password });
    if (error) throw translate(error);
    return toAppUser(data.user);
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: appUrl() } });
    if (error) throw translate(error);
  },

  /** Cria a conta. Se a confirmação por e-mail estiver ativa, retorna `needsCode`. */
  async startSignup({ fullName, email, password }) {
    const pwdError = validatePassword(password);
    if (pwdError) throw new Error(pwdError);
    const { data, error } = await supabase.auth.signUp({
      email: normalize(email),
      password,
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: appUrl() },
    });
    if (error) throw translate(error);
    // Com confirmação ativa, e-mail já cadastrado volta sem identidades (proteção contra enumeração)
    if (data.user && data.user.identities?.length === 0) throw new Error('Já existe uma conta com este e-mail.');
    return { needsCode: !data.session, user: toAppUser(data.user) };
  },

  async confirmSignup(email, code) {
    const params = { email: normalize(email), token: code.trim() };
    let { data, error } = await supabase.auth.verifyOtp({ ...params, type: 'signup' });
    if (error) ({ data, error } = await supabase.auth.verifyOtp({ ...params, type: 'email' }));
    if (error) throw translate(error);
    return toAppUser(data.user);
  },

  async resendSignupCode(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email: normalize(email) });
    if (error) throw translate(error);
  },

  async requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(normalize(email), { redirectTo: appUrl('reset-password') });
    // Erros de "usuário não existe" não são revelados; só limite de envio é relevante
    if (error && /rate limit|security purposes/i.test(error.message)) throw translate(error);
    return { token: null };
  },

  /** No modo nuvem, o link do e-mail já abre uma sessão de recuperação. */
  async hasRecoverySession() {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  },

  async resetPassword(_token, newPassword) {
    const pwdError = validatePassword(newPassword);
    if (pwdError) throw new Error(pwdError);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw translate(error);
  },

  async logout() {
    await supabase.auth.signOut();
  },
};

// ---------------------------------------------------------------------------
// Local (localStorage)
// ---------------------------------------------------------------------------

const USERS_KEY = `${PREFIX}:users`;
const PENDING_KEY = `${PREFIX}:pending-signups`;
const RESETS_KEY = `${PREFIX}:password-resets`;

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

async function hash(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const users = () => readJSON(USERS_KEY, []);
// eslint-disable-next-line no-unused-vars
const publicUser = ({ passwordHash, salt, ...rest }) => rest;

const localAuth = {
  mode: 'local',
  supportsGoogle: false,

  async me() {
    const session = readJSON(SESSION_KEY, null);
    if (!session) return null;
    const user = users().find((u) => u.id === session.userId);
    return user ? publicUser(user) : null;
  },

  onChange() {
    return () => {};
  },

  async login(email, password) {
    await wait();
    const user = users().find((u) => u.email === normalize(email));
    if (!user || user.passwordHash !== (await hash(password, user.salt))) {
      throw new Error('E-mail ou senha inválidos.');
    }
    writeJSON(SESSION_KEY, { userId: user.id, at: new Date().toISOString() });
    return publicUser(user);
  },

  async signInWithGoogle() {
    throw new Error('Login com Google indisponível no modo local.');
  },

  async startSignup({ fullName, email, password }) {
    await wait();
    const normalized = normalize(email);
    if (users().some((u) => u.email === normalized)) throw new Error('Já existe uma conta com este e-mail.');
    const pwdError = validatePassword(password);
    if (pwdError) throw new Error(pwdError);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const salt = uid();
    const pending = readJSON(PENDING_KEY, {});
    pending[normalized] = {
      fullName: fullName.trim(),
      salt,
      passwordHash: await hash(password, salt),
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    writeJSON(PENDING_KEY, pending);
    return { needsCode: true, code }; // modo local: código exibido na interface
  },

  async confirmSignup(email, code) {
    await wait();
    const normalized = normalize(email);
    const pending = readJSON(PENDING_KEY, {});
    const entry = pending[normalized];
    if (!entry || entry.expiresAt < Date.now()) throw new Error('Código expirado. Reinicie o cadastro.');
    if (entry.code !== code.trim()) throw new Error('Código incorreto.');

    const user = {
      id: uid(),
      email: normalized,
      full_name: entry.fullName,
      role: 'user',
      created_date: new Date().toISOString(),
      salt: entry.salt,
      passwordHash: entry.passwordHash,
    };
    writeJSON(USERS_KEY, [...users(), user]);
    delete pending[normalized];
    writeJSON(PENDING_KEY, pending);
    writeJSON(SESSION_KEY, { userId: user.id, at: new Date().toISOString() });
    return publicUser(user);
  },

  async resendSignupCode() {},

  async requestPasswordReset(email) {
    await wait();
    const user = users().find((u) => u.email === normalize(email));
    if (!user) return { token: null };
    const token = uid().replace(/-/g, '');
    const resets = readJSON(RESETS_KEY, {});
    resets[token] = { userId: user.id, expiresAt: Date.now() + 60 * 60 * 1000 };
    writeJSON(RESETS_KEY, resets);
    return { token };
  },

  async hasRecoverySession() {
    return false;
  },

  async resetPassword(token, newPassword) {
    await wait();
    const resets = readJSON(RESETS_KEY, {});
    const entry = resets[token];
    if (!entry || entry.expiresAt < Date.now()) throw new Error('Link inválido ou expirado.');
    const pwdError = validatePassword(newPassword);
    if (pwdError) throw new Error(pwdError);

    const salt = uid();
    const passwordHash = await hash(newPassword, salt);
    writeJSON(USERS_KEY, users().map((u) => (u.id === entry.userId ? { ...u, salt, passwordHash } : u)));
    delete resets[token];
    writeJSON(RESETS_KEY, resets);
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};

export const auth = isCloud ? cloudAuth : localAuth;
