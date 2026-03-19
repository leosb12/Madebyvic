import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'

const AuthContext = createContext(null)

const profileFallback = (user) => ({
  email: user?.email ?? '',
  full_name: user?.user_metadata?.full_name ?? null,
  phone: user?.user_metadata?.phone ?? null,
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (user) => {
    if (!user || !supabaseReady || !supabase) {
      setProfile(null)
      return
    }

    const { data } = await supabase
      .schema('app')
      .from('profiles')
      .select('email, full_name, phone')
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

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading],
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
