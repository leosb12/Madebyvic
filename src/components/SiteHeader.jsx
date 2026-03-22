import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function SiteHeader({
  isHome = false,
  onMobileMenuChange,
  transparent = false,
  overlay = false,
  solidAfterScroll = false,
  solidScrollThreshold = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSolid, setIsSolid] = useState(() => {
    if (typeof window === 'undefined') return false
    if (!solidAfterScroll) return false
    return window.scrollY > solidScrollThreshold
  })
  const { user, profile, loading } = useAuth()

  const fullName = profile?.full_name || user?.user_metadata?.full_name || ''
  const firstName = fullName.trim().split(/\s+/)[0] || 'Profile'

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // Returns the correct route or hash for each menu item, always scrolls to section if not on home
  const getMenuLink = (item) => {
    if (item === 'services') return { type: 'route', to: '/services' }
    if (item === 'contact') return { type: 'route', to: '/contact' }
    if (item === 'murals') return { type: 'section', hash: '#murals' }
    if (item === 'digital') return { type: 'section', hash: '#digital-design' }
    return { type: 'section', hash: '#' + item }
  }

  // Helper to determine if current path is home
  const isHomePath = location.pathname === '/'

  // Scroll to section after navigation
  const scrollToSection = (hash) => {
    if (!hash) return;
    const el = document.getElementById(hash.replace('#', ''));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handler for section links
  const handleSectionNav = (hash) => (e) => {
    e.preventDefault();
    if (isHomePath) {
      scrollToSection(hash);
    } else {
      navigate('/');
      setTimeout(() => scrollToSection(hash), 100);
    }
    closeMobileMenu();
  };

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
    window.addEventListener('resize', updateSolidState)

    return () => {
      window.removeEventListener('scroll', updateSolidState)
      window.removeEventListener('resize', updateSolidState)
    }
  }, [solidAfterScroll, solidScrollThreshold])

  const useTransparentStyle = transparent && !isSolid
  const shouldOverlay = overlay || transparent

  return (
    <>
      <header
        className={`fixed left-0 top-0 z-50 w-full transition-all duration-300 ${
          useTransparentStyle
            ? 'border-b border-transparent bg-transparent backdrop-blur-0'
            : 'border-b border-white/10 bg-black/80 backdrop-blur-xl'
        }`}
      >
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-7 lg:px-10">
          {isHome ? (
            <a
              href="#home"
              className="display-font z-50 shrink-0 text-lg tracking-[0.18em] text-white"
              onClick={closeMobileMenu}
            >
              MADE BY VIC
            </a>
          ) : (
            <Link
              to="/"
              className="display-font z-50 shrink-0 text-lg tracking-[0.18em] text-white"
              onClick={closeMobileMenu}
            >
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
            <span
              className={`block h-[1.5px] w-5 origin-center bg-white transition-all duration-300 ${
                isMobileMenuOpen ? 'translate-y-[7.5px] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-[1.5px] w-5 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-[1.5px] w-5 origin-center bg-white transition-all duration-300 ${
                isMobileMenuOpen ? '-translate-y-[7.5px] -rotate-45' : ''
              }`}
            />
          </button>

          <div className="hidden items-center gap-7 text-xs tracking-[0.18em] text-white/70 md:flex">
            {/* SERVICES */}
            <Link to="/services" className="story-link">
              SERVICES
            </Link>
            {/* MURALS */}
            <a href="#murals" className="story-link" onClick={handleSectionNav('#murals')}>MURALS</a>
            {/* DIGITAL */}
            <a href="#digital-design" className="story-link" onClick={handleSectionNav('#digital-design')}>DIGITAL</a>
            {/* CONTACT */}
            <Link to="/contact" className="story-link">
              CONTACT
            </Link>

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
          className={`fixed inset-0 top-[73px] z-40 bg-transparent backdrop-blur-0 transition-opacity duration-300 md:hidden ${
            isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={closeMobileMenu}
        />

        <div
          id="mobile-nav"
          className={`fixed right-0 top-[73px] z-50 flex h-[calc(100svh-73px)] w-[85%] max-w-[320px] transform flex-col overflow-y-auto border-l border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#111] p-5 shadow-2xl transition-transform duration-300 md:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mt-2 flex flex-col gap-3">
            {/* SERVICES */}
            <Link
              to="/services"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={closeMobileMenu}
            >
              SERVICES
            </Link>
            {/* MURALS */}
            <a
              href="#murals"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={handleSectionNav('#murals')}
            >
              MURALS
            </a>
            {/* DIGITAL */}
            <a
              href="#digital-design"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={handleSectionNav('#digital-design')}
            >
              DIGITAL
            </a>
            {/* CONTACT */}
            <Link
              to="/contact"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={closeMobileMenu}
            >
              CONTACT
            </Link>

            {user && !loading ? (
              <Link
                to="/profile"
                className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
                onClick={closeMobileMenu}
              >
                PROFILE ({firstName.toUpperCase()})
              </Link>
            ) : (
              <Link
                to="/sign-in"
                className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
                onClick={closeMobileMenu}
              >
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      </header>

      {!shouldOverlay ? <div aria-hidden="true" className="h-[73px] w-full" /> : null}
    </>
  )
}

export default SiteHeader