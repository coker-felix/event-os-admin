import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  ADMIN_SESSION_CHANGE_EVENT,
  ADMIN_SESSION_KEY,
  clearAdminSession,
  loginAdmin,
  readStoredAdminSession,
  storeAdminSession,
  type AuthSession,
} from '../services/admin-auth'

export type { AuthSession } from '../services/admin-auth'

interface AuthContextValue {
  session: AuthSession | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function getStoredAuthSession(): AuthSession | null {
  return readStoredAdminSession()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(getStoredAuthSession)

  useEffect(() => {
    const syncSession = (event: StorageEvent) => {
      if (event.key === ADMIN_SESSION_KEY) setSession(readStoredAdminSession())
    }
    const syncCurrentSession = () => setSession(readStoredAdminSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, syncCurrentSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, syncCurrentSession)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await loginAdmin({ email, password })
    storeAdminSession(nextSession)
    setSession(nextSession)
  }, [])

  const signOut = useCallback(() => {
    clearAdminSession()
    setSession(null)
  }, [])

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
