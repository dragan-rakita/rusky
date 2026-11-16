import { createAuthClient } from 'better-auth/client';
import { AUTH_USER_KEY } from './constants';

const client = createAuthClient({ basePath: '/api/auth' });

const pick = (u: { id: string; email: string; name: string }): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

class AuthStore {
  user = $state<AuthUser | null>(null);

  init() {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      this.user = raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      this.user = null;
    }
  }

  #set(user: AuthUser | null) {
    this.user = user;
    try {
      if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // Storage refused: the session cookie still works for this visit.
    }
  }

  /** Asks the server who is signed in. Offline, the remembered user stays. */
  async refresh() {
    if (!navigator.onLine) return;
    try {
      const { data, error } = await client.getSession();
      if (error) return;
      this.#set(data?.user ? pick(data.user) : null);
    } catch {
      // Network trouble: keep what we had.
    }
  }

  async signIn(email: string, password: string) {
    const { data, error } = await client.signIn.email({ email, password });
    if (error || !data) throw new Error(error?.message || 'Could not sign in');
    this.#set(pick(data.user));
  }

  async signUp(email: string, password: string) {
    const name = email.split('@')[0];
    const { data, error } = await client.signUp.email({ email, password, name });
    if (error || !data) throw new Error(error?.message || 'Could not create the account');
    this.#set(pick(data.user));
  }

  async signOut() {
    await client.signOut().catch(() => undefined);
    this.#set(null);
  }

  /** The server lost the session (expired or signed out elsewhere). */
  forget() {
    this.#set(null);
  }

  async registrationOpen(): Promise<boolean> {
    try {
      const res = await fetch('/api/registration');
      return res.ok && ((await res.json()) as { open: boolean }).open;
    } catch {
      return false;
    }
  }
}

export const auth = new AuthStore();
