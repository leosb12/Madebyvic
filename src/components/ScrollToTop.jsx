import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    // Si tenemos un hash (como #murals), no forzamos el scroll top inmediato, 
    // dejamos que el ancla haga su propio scroll.
    if (!hash && prevPathname.current !== pathname) {
      window.scrollTo(0, 0)
    }
    prevPathname.current = pathname
  }, [pathname, hash])

  return null
}

export default ScrollToTop
