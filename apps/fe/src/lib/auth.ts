import type { User } from '@simple-invoice/shared';
import { create } from 'zustand';

/**
 * Auth store — user profile + a "boot status" flag.
 *
 * The JWT is NOT stored here. It lives in an httpOnly cookie set by
 * the BE on /auth/login, so it can't be read by JS (XSS-safe). The
 * browser attaches it automatically on every request with
 * `credentials: 'include'`.
 *
 * `status` tracks the initial bootstrap call to /auth/me:
 *  - 'idle'    — haven't tried yet (only the very first render)
 *  - 'loading' — bootstrap in flight
 *  - 'authed'  — cookie was valid, user is loaded
 *  - 'guest'   — no cookie / expired / invalid; show the login screen
 */
export type AuthStatus = 'idle' | 'loading' | 'authed' | 'guest';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  setUser: (user: User) => void;
  setGuest: () => void;
  setLoading: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: 'authed' }),
  setGuest: () => set({ user: null, status: 'guest' }),
  setLoading: () => set({ status: 'loading' }),
}));
