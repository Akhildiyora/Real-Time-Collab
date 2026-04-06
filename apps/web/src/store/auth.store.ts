import { create } from "zustand";
import { authService } from "../services/auth.service";
import type { User } from "../services/auth.service";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem("accessToken"),
  isAuthenticated: !!localStorage.getItem("accessToken"),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.signin(email, password);
      const user = await authService.getMe();
      set({ user, accessToken: data.accessToken, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await authService.signup(email, password);
      await useAuthStore.getState().login(email, password);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      set({ isAuthenticated: false, user: null, accessToken: null });
      return;
    }
    set({ isLoading: true, accessToken: token });
    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      authService.logout();
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
