/**
 * Autenticação local — substitui `base44.auth.*`.
 *
 * Usuários ficam no localStorage com senha em hash SHA-256 + salt.
 * Envio de e-mail (código de verificação e link de redefinição) é simulado:
 * o código/link é devolvido para a interface exibir em "modo local".
 * Em produção, troque este módulo por um provedor real (Supabase Auth, Firebase Auth…).
 */
import { readJSON, writeJSON, uid, SESSION_KEY, PREFIX } from './store';

const USERS_KEY = `${PREFIX}:users`;
const PENDING_KEY = `${PREFIX}:pending-signups`;
const RESETS_KEY = `${PREFIX}:password-resets`;

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const normalize = (email) => email.trim().toLowerCase();

async function hash(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const users = () => readJSON(USERS_KEY, []);
const publicUser = ({ passwordHash, salt, ...rest }) => rest;

export function validatePassword(password) {
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return null;
}

export const auth = {
  async me() {
    const session = readJSON(SESSION_KEY, null);
    if (!session) return null;
    const user = users().find((u) => u.id === session.userId);
    return user ? publicUser(user) : null;
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

  /** Etapa 1 do cadastro: valida dados e "envia" um código de 6 dígitos. */
  async startSignup({ fullName, email, password }) {
    await wait();
    const normalized = normalize(email);
    if (users().some((u) => u.email === normalized)) {
      throw new Error('Já existe uma conta com este e-mail.');
    }
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
    return { code }; // modo local: exibido na interface no lugar do e-mail
  },

  /** Etapa 2 do cadastro: confirma o código e cria a conta. */
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

  /** Gera token de redefinição. Retorna o token só para o modo local exibir o link. */
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

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};
