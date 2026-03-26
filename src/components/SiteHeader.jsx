import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const announcementRotationMs = 5500

function SiteHeader({
  isHome = false,
  onMobileMenuChange,
  transparent = false,
  overlay = false,
  solidAfterScroll = false,
  solidScrollThreshold = 0,
  announcement = null,
  announcements = null,
  onAnnouncementDismiss,
  forceShowMenuButton = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const announcementRef = useRef(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAnnouncementClosed, setIsAnnouncementClosed] = useState(false)
  const [announcementIndex, setAnnouncementIndex] = useState(0)
  const [announcementHeight, setAnnouncementHeight] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [isSolid, setIsSolid] = useState(() => {
    if (typeof window === 'undefined') return false
    if (!solidAfterScroll) return false
    return window.scrollY > solidScrollThreshold
  })

  const { user, profile, loading } = useAuth()
  const isAdmin = profile?.is_admin === true

  const fullName = profile?.full_name || user?.user_metadata?.full_name || ''
  const firstName = fullName.trim().split(/\s+/)[0] || 'Profile'

  const closeMobileMenu = () => setIsMobileMenuOpen(false)
  const isHomePath = location.pathname === '/'
  const announcementItems = Array.isArray(announcements)
    ? announcements.filter((item) => item?.message)
    : announcement?.message
      ? [announcement]
      : []
  const hasMultipleAnnouncements = announcementItems.length > 1
  const activeAnnouncement = announcementItems[announcementIndex] || announcementItems[0] || null

  const scrollToSection = (hash) => {
    if (!hash) return
    const el = document.getElementById(hash.replace('#', ''))
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSectionNav = (hash) => (event) => {
    event.preventDefault()
    if (isHomePath) {
      scrollToSection(hash)
    } else {
      navigate('/')
      setTimeout(() => scrollToSection(hash), 100)
    }
    closeMobileMenu()
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
    window.addEventListener('resize', updateSolidState)

    return () => {
      window.removeEventListener('scroll', updateSolidState)
      window.removeEventListener('resize', updateSolidState)
    }
  }, [solidAfterScroll, solidScrollThreshold])

  useEffect(() => {
    setAnnouncementIndex(0)
    setIsAnnouncementClosed(false)
  }, [announcementItems.length])

  useEffect(() => {
    if (!isHome || isAnnouncementClosed || announcementItems.length <= 1) {
      return
    }

    const interval = window.setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % announcementItems.length)
    }, announcementRotationMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [isHome, isAnnouncementClosed, announcementItems.length])

  const closeAnnouncement = () => {
    setIsAnnouncementClosed(true)
    if (typeof onAnnouncementDismiss === 'function') {
      onAnnouncementDismiss(activeAnnouncement)
    }
  }

  const showPrevAnnouncement = () => {
    if (!hasMultipleAnnouncements) {
      return
    }
    setAnnouncementIndex((current) => (current - 1 + announcementItems.length) % announcementItems.length)
  }

  const showNextAnnouncement = () => {
    if (!hasMultipleAnnouncements) {
      return
    }
    setAnnouncementIndex((current) => (current + 1) % announcementItems.length)
  }

  const useTransparentStyle = transparent && !isSolid
  const shouldOverlay = overlay || transparent
  const showAnnouncement = isHome && Boolean(activeAnnouncement?.message) && !isAnnouncementClosed
  const navOffset = 73
  const headerTop = showAnnouncement ? Math.max(0, announcementHeight - scrollY) : 0
  const mobileMenuTop = headerTop + navOffset

  useEffect(() => {
    const updateAnnouncementMetrics = () => {
      const nextHeight = showAnnouncement ? Math.ceil(announcementRef.current?.getBoundingClientRect().height || 0) : 0
      setAnnouncementHeight(nextHeight)
      setScrollY(typeof window !== 'undefined' ? window.scrollY : 0)
    }

    updateAnnouncementMetrics()

    window.addEventListener('resize', updateAnnouncementMetrics)
    window.addEventListener('scroll', updateAnnouncementMetrics, { passive: true })

    return () => {
      window.removeEventListener('resize', updateAnnouncementMetrics)
      window.removeEventListener('scroll', updateAnnouncementMetrics)
    }
  }, [showAnnouncement, activeAnnouncement])

  return (
    <>
      {showAnnouncement ? (
        <div ref={announcementRef} className="w-full border-b border-black/15 bg-[#f7f4ee] text-black">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:px-7 lg:px-10">
            {hasMultipleAnnouncements ? (
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-black/45 text-xl text-black transition hover:bg-black hover:text-white"
                onClick={showPrevAnnouncement}
                aria-label="Previous announcement"
                title="Previous"
              >
                &lt;
              </button>
            ) : null}

            <p className="flex-1 text-center font-serif text-[18px] leading-[1.35] tracking-[0.01em] text-black/90">
              {activeAnnouncement.message}
            </p>

            {hasMultipleAnnouncements ? (
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-black/45 text-xl text-black transition hover:bg-black hover:text-white"
                onClick={showNextAnnouncement}
                aria-label="Next announcement"
                title="Next"
              >
                &gt;
              </button>
            ) : null}

            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-black/70 text-xl text-black transition hover:bg-black hover:text-white"
              onClick={closeAnnouncement}
              aria-label="Dismiss announcement"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <header
        style={{ top: `${headerTop}px` }}
        className={`fixed left-0 z-50 w-full transition-all duration-300 ${
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
            className="group z-50 mr-1 flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[6px] rounded-sm border border-white/70 bg-black md:hidden sm:mr-0"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span
              className={`block h-[2.5px] w-[22px] rounded-full origin-center bg-white transition-all duration-300 ${
                isMobileMenuOpen ? 'translate-y-[7.5px] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-[2.5px] w-[22px] rounded-full bg-white transition-all duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-[2.5px] w-[22px] rounded-full origin-center bg-white transition-all duration-300 ${
                isMobileMenuOpen ? '-translate-y-[7.5px] -rotate-45' : ''
              }`}
            />
          </button>

          <div className={`hidden items-center gap-7 text-xs tracking-[0.18em] text-white/70 ${forceShowMenuButton ? 'lg:flex' : 'md:flex'}`}>
            <Link to="/services" className="story-link">
              SERVICES
            </Link>
            <a href="#murals" className="story-link" onClick={handleSectionNav('#murals')}>
              MURALS
            </a>
            <a href="#digital-design" className="story-link" onClick={handleSectionNav('#digital-design')}>
              DIGITAL DESIGN
            </a>
            <Link to="/contact" className="story-link">
              CONTACT
            </Link>

            {isAdmin ? (
              <Link to="/admin/announcements" className="story-link" onClick={closeMobileMenu}>
                ADMIN
              </Link>
            ) : null}

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
      </header>

      <div
        className={`fixed inset-0 z-40 bg-transparent backdrop-blur-0 transition-opacity duration-300 md:hidden ${
            isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ top: `${mobileMenuTop}px` }}
          onClick={closeMobileMenu}
        />

        <div
          id="mobile-nav"
          className={`fixed right-0 z-50 flex w-[85%] max-w-[320px] transform flex-col overflow-y-auto border-l border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#111] p-5 shadow-2xl transition-transform duration-300 md:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ top: `${mobileMenuTop}px`, height: `calc(100svh - ${mobileMenuTop}px)` }}
        >
          <div className="mt-2 flex flex-col gap-3">
            <Link
              to="/services"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={closeMobileMenu}
            >
              SERVICES
            </Link>
            <a
              href="#murals"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={handleSectionNav('#murals')}
            >
              MURALS
            </a>
            <a
              href="#digital-design"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={handleSectionNav('#digital-design')}
            >
              DIGITAL DESIGN
            </a>
            <Link
              to="/contact"
              className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
              onClick={closeMobileMenu}
            >
              CONTACT
            </Link>

            {isAdmin ? (
              <Link
                to="/admin/announcements"
                className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5"
                onClick={closeMobileMenu}
              >
                ADMIN
              </Link>
            ) : null}

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

      {!shouldOverlay ? <div aria-hidden="true" className="w-full" style={{ height: `${navOffset}px` }} /> : null}
    </>
  )
}

export default SiteHeader
