import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isPlaner: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null });
      },
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'ADMIN',
      isPlaner: () => {
        const role = get().user?.role;
        return role === 'ADMIN' || role === 'PLANER';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
