import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function SiteHeader({
  isHome = false,
  onMobileMenuChange,
  transparent = false,
  overlay = false,
  solidAfterScroll = false,
  solidScrollThreshold = 0,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSolid, setIsSolid] = useState(false)
  const { user, profile, loading } = useAuth()

  const fullName = profile?.full_name || user?.user_metadata?.full_name || ''
  const firstName = fullName.trim().split(/\s+/)[0] || 'Profile'

  const closeMobileMenu = () => setIsMobileMenuOpen(false)
  const toSection = (sectionId) => {
    if (isHome) {
      return `#${sectionId}`
    }
    if (sectionId === 'contact') {
      return '/contact'
    }
    if (sectionId === 'services') {
      return '/services'
    }
    return `/#${sectionId}`
  }

  useEffect(() => {
    if (typeof onMobileMenuChange === 'function') {
      onMobileMenuChange(isMobileMenuOpen)
    }
  }, [isMobileMenuOpen, onMobileMenuChange])

  useEffect(() => {
    if (!solidAfterScroll) {
      setIsSolid(false)
      return
    }

    const updateSolidState = () => {
      setIsSolid(window.scrollY > solidScrollThreshold)
    }

    updateSolidState()
    window.addEventListener('scroll', updateSolidState, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateSolidState)
    }
  }, [solidAfterScroll, solidScrollThreshold])

  const useTransparentStyle = transparent && !isSolid

  return (
    <header
      className={`${overlay ? 'fixed left-0 top-0' : 'sticky top-0'} z-50 w-full ${
        useTransparentStyle ? 'border-b border-transparent bg-transparent backdrop-blur-0' : 'border-b border-white/10 bg-black/80 backdrop-blur-xl'
      }`}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-7 lg:px-10">
        {isHome ? (
          <a href="#home" className="display-font z-50 shrink-0 text-lg tracking-[0.18em] text-white" onClick={closeMobileMenu}>
            MADE BY VIC
          </a>
        ) : (
          <Link to="/" className="display-font z-50 shrink-0 text-lg tracking-[0.18em] text-white" onClick={closeMobileMenu}>
            MADE BY VIC
          </Link>
        )}

        <button
          type="button"
          className="group absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 flex-col items-center justify-center gap-[6px] rounded-sm border border-white/20 bg-black/60 md:hidden"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <span className={`block h-[1.5px] w-5 origin-center bg-white transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-[7.5px] rotate-45' : ''}`} />
          <span className={`block h-[1.5px] w-5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-[1.5px] w-5 origin-center bg-white transition-all duration-300 ${isMobileMenuOpen ? '-translate-y-[7.5px] -rotate-45' : ''}`} />
        </button>

        <div className="hidden items-center gap-7 text-xs tracking-[0.18em] text-white/70 md:flex">
          <a href={toSection('services')} className="story-link">
            SERVICES
          </a>
          <a href={toSection('murals')} className="story-link">
            MURALS
          </a>
          <a href={toSection('digital-design')} className="story-link">
            DIGITAL
          </a>
          <a href={toSection('contact')} className="story-link">
            CONTACT
          </a>
          {user && !loading ? (
            <Link to="/profile" className="story-link nav-user-link" onClick={closeMobileMenu}>
              <span className="nav-user-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="presentation">
                  <path
                    d="M12 11c2.761 0 5-2.462 5-5.5S14.761 0 12 0 7 2.462 7 5.5 9.239 11 12 11zm0 2c-4.42 0-8 2.91-8 6.5V24h16v-4.5c0-3.59-3.58-6.5-8-6.5z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              {firstName.toUpperCase()}
            </Link>
          ) : (
            <Link to="/sign-in" className="story-link" onClick={closeMobileMenu}>
              SIGN IN
            </Link>
          )}
        </div>
      </nav>

      <div
        className={`fixed inset-0 top-[73px] z-40 bg-black/70 backdrop-blur-md transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={closeMobileMenu}
      />
      <div
        id="mobile-nav"
        className={`fixed right-0 top-[73px] z-50 flex h-[calc(100svh-73px)] w-[85%] max-w-[320px] transform flex-col overflow-y-auto border-l border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#111] p-5 shadow-2xl transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="mt-2 flex flex-col gap-3">
          <a href={toSection('services')} className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>
            SERVICES
          </a>
          <a href={toSection('murals')} className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>
            MURALS
          </a>
          <a href={toSection('digital-design')} className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>
            DIGITAL
          </a>
          <a href={toSection('contact')} className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>
            CONTACT
          </a>
          {user && !loading ? (
            <Link to="/profile" className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>
              PROFILE ({firstName.toUpperCase()})
            </Link>
          ) : (
            <Link to="/sign-in" className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
