import { create } from 'zustand'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TUTOR' | 'STUDENT'

interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  instituteId: string | null
  avatarUrl: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, token: string) => void
  setAccessToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}))
