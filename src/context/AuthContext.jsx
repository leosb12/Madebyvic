import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

const AuthContext = createContext(null)
const adminViewStorageKeyPrefix = 'mbv:admin-view-enabled:'

const profileFallback = (user) => ({
  email: user?.email ?? '',
  full_name: user?.user_metadata?.full_name ?? null,
  phone: user?.user_metadata?.phone ?? null,
  is_admin: false,
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adminViewEnabled, setAdminViewEnabled] = useState(true)

  const isAdmin = profile?.is_admin === true

  const fetchProfile = async (user) => {
    if (!user || !supabaseReady || !supabase) {
      setProfile(null)
      return
    }

    const { data } = await supabase
      .schema('app')
      .from('profiles')
      .select('email, full_name, phone, is_admin')
      .eq('id', user.id)
      .maybeSingle()

    setProfile(data ?? profileFallback(user))
  }

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    const init = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!mounted) {
        return
      }

      setSession(currentSession)

      if (currentSession?.user) {
        await fetchProfile(currentSession.user)
      }

      setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (nextSession?.user) {
        fetchProfile(nextSession.user)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const userId = session?.user?.id
    if (!userId || !isAdmin) {
      setAdminViewEnabled(true)
      return
    }

    const saved = window.localStorage.getItem(`${adminViewStorageKeyPrefix}${userId}`)
    if (saved === 'false') {
      setAdminViewEnabled(false)
      return
    }

    setAdminViewEnabled(true)
  }, [session?.user?.id, isAdmin])

  const signOut = async () => {
    if (!supabaseReady || !supabase) {
      return { error: new Error('Supabase is not configured.') }
    }

    return supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user)
    }
  }

  const setSeeAsAdmin = (enabled) => {
    const nextValue = enabled === true

    if (!isAdmin) {
      return
    }

    setAdminViewEnabled(nextValue)

    if (typeof window !== 'undefined' && session?.user?.id) {
      window.localStorage.setItem(`${adminViewStorageKeyPrefix}${session.user.id}`, String(nextValue))
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      canEditAsAdmin: isAdmin && adminViewEnabled,
      seeAsAdmin: adminViewEnabled,
      setSeeAsAdmin,
      loading,
      signOut,
      refreshProfile,
    }),
    [session, profile, isAdmin, adminViewEnabled, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
