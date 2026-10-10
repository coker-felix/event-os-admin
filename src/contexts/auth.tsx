import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { loginAdmin } from '../services/admin-auth'

const AUTH_SESSION_KEY = 'event-os-admin-session'

export interface AuthSession {
  token: string
}

interface AuthContextValue {
  session: AuthSession | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function parseSession(value: string | null): AuthSession | null {
  if (!value) return null

  try {
    const session: unknown = JSON.parse(value)
    if (
      typeof session === 'object' && session !== null &&
      'token' in session && typeof session.token === 'string' && session.token.length > 0
    ) {
      return session as AuthSession
    }
  } catch {
    // An invalid stored session is treated as signed out.
  }

  return null
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  const session = parseSession(window.sessionStorage.getItem(AUTH_SESSION_KEY))
  if (!session) window.sessionStorage.removeItem(AUTH_SESSION_KEY)
  return session
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(getStoredAuthSession)

  useEffect(() => {
    const syncSession = (event: StorageEvent) => {
      if (event.key === AUTH_SESSION_KEY) setSession(parseSession(event.newValue))
    }
    window.addEventListener('storage', syncSession)
    return () => window.removeEventListener('storage', syncSession)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await loginAdmin({ email, password })
    window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }, [])

  const signOut = useCallback(() => {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY)
    setSession(null)
  }, [])

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
