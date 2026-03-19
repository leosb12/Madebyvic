import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigError, supabaseReady } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  phone: '',
}

function AuthPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modeSuggestion, setModeSuggestion] = useState(null)

  useEffect(() => {
    if (session?.user) {
      navigate('/', { replace: true })
    }
  }, [session, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const clearFeedback = () => {
    setError('')
    setModeSuggestion(null)
  }

  const switchMode = (nextMode) => {
    clearFeedback()
    setMode(nextMode)
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError(supabaseConfigError)
      return
    }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (signInError) {
      setError(signInError.message)
      if (signInError.message.toLowerCase().includes('invalid login credentials')) {
        setModeSuggestion({
          targetMode: 'signup',
          text: "If you don't have an account yet, you can register now.",
          actionLabel: 'Create account',
        })
      }
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
    setLoading(false)
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError(supabaseConfigError)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone || null,
        },
        emailRedirectTo: `${window.location.origin}/sign-in`,
      },
    })

    if (signUpError) {
      const normalizedMessage = signUpError.message.toLowerCase()

      if (normalizedMessage.includes('database error saving new user')) {
        setError(
          'Database trigger error while creating the user. Please update your app.handle_new_user() function to match your current app.profiles columns and try again.',
        )
        setLoading(false)
        return
      }

      setError(signUpError.message)
      if (normalizedMessage.includes('already registered')) {
        setModeSuggestion({
          targetMode: 'signin',
          text: 'This email is already registered. Do you want to sign in instead?',
          actionLabel: 'Go to sign in',
        })
      }
      setLoading(false)
      return
    }

    if (data.session) {
      navigate('/', { replace: true })
      setLoading(false)
      return
    }

    const { error: signInAfterRegisterError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (signInAfterRegisterError) {
      setError('Account created, but automatic sign-in failed. Please sign in manually.')
      setMode('signin')
      setForm((prev) => ({ ...emptyForm, email: prev.email }))
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
    setLoading(false)
  }

  return (
    <main className="auth-shell">
      <div className="auth-background" aria-hidden="true" />

      <section className="auth-card">
        <div className="auth-topbar">
          <Link to="/" className="story-link auth-back-link">
            Back to home
          </Link>
          <p className="display-font auth-brand">MADE BY VIC</p>
        </div>

        {mode === 'signin' ? (
          <>
            <h1 className="display-font auth-title">Sign In</h1>
            <p className="auth-subtitle">Sign in with your account to continue.</p>

            <form className="auth-form" onSubmit={handleSignIn}>
              <label className="field-wrap">
                <span>Email</span>
                <input
                  className="auth-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@email.com"
                />
              </label>

              <label className="field-wrap">
                <span>Password</span>
                <input
                  className="auth-input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </label>

              {error ? <p className="auth-message is-error">{error}</p> : null}

              {modeSuggestion?.targetMode === 'signup' ? (
                <p className="auth-switch-row">
                  <span>{modeSuggestion.text}</span>
                  <button type="button" className="auth-inline-btn" onClick={() => switchMode('signup')}>
                    {modeSuggestion.actionLabel}
                  </button>
                </p>
              ) : null}

              <button type="submit" className="action-btn action-btn-solid auth-submit" disabled={loading}>
                {loading ? 'Processing...' : 'Sign In'}
              </button>
            </form>

            <p className="auth-switch-row">
              <span>If you do not have an account yet,</span>
              <button type="button" className="auth-inline-btn" onClick={() => switchMode('signup')}>
                register now
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="display-font auth-title">Create Account</h1>
            <p className="auth-subtitle">Complete your profile and create your account.</p>

            <div className="auth-register-layout">
              <form className="auth-form" onSubmit={handleSignUp}>
                <div className="auth-form-grid">
                  <label className="field-wrap auth-field-full">
                    <span>Full Name</span>
                    <input
                      className="auth-input"
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="field-wrap">
                    <span>Email</span>
                    <input
                      className="auth-input"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="you@email.com"
                    />
                  </label>

                  <label className="field-wrap">
                    <span>Phone</span>
                    <input
                      className="auth-input"
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Optional"
                    />
                  </label>

                  <label className="field-wrap">
                    <span>Password</span>
                    <input
                      className="auth-input"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                    />
                  </label>

                  <label className="field-wrap">
                    <span>Confirm Password</span>
                    <input
                      className="auth-input"
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Repeat your password"
                    />
                  </label>
                </div>

                {error ? <p className="auth-message is-error">{error}</p> : null}

                {modeSuggestion?.targetMode === 'signin' ? (
                  <p className="auth-switch-row">
                    <span>{modeSuggestion.text}</span>
                    <button type="button" className="auth-inline-btn" onClick={() => switchMode('signin')}>
                      {modeSuggestion.actionLabel}
                    </button>
                  </p>
                ) : null}

                <button type="submit" className="action-btn action-btn-solid auth-submit" disabled={loading}>
                  {loading ? 'Processing...' : 'Create Account'}
                </button>
              </form>

              <aside className="auth-register-side">
                <p className="display-font">Profile Setup</p>
                <h2>Create your access in one step</h2>
                <ul>
                  <li>Use a valid email address.</li>
                  <li>Set a secure password (at least 6 characters).</li>
                  <li>Add your phone if you want faster contact.</li>
                </ul>
                <p className="auth-register-note">
                  Already have an account?
                  <button type="button" className="auth-inline-btn" onClick={() => switchMode('signin')}>
                    Sign in here
                  </button>
                </p>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default AuthPage
