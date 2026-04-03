import { create } from 'zustand'

type AuthUser = {
  sub: string
  email: string
  role: 'USER' | 'ADMIN'
}

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setSession: (accessToken, refreshToken, user) => {
    set({ accessToken, refreshToken, user })
  },
  clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
}))
