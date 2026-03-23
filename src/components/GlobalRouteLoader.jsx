import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import GraffitiLoader from './GraffitiLoader'

const minVisibleMs = 180
const hardSafetyTimeoutMs = 30000

const wait = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const waitForDocumentReady = () =>
  new Promise((resolve) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      resolve()
      return
    }

    const onReady = () => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        document.removeEventListener('readystatechange', onReady)
        resolve()
      }
    }

    document.addEventListener('readystatechange', onReady)
  })

const waitForFonts = () => {
  if (!document.fonts?.ready) {
    return Promise.resolve()
  }

  return document.fonts.ready
}

const isCriticalImage = (img) => {
  const source = String(img.currentSrc || img.src || '').trim()
  if (!source) {
    return false
  }

  if (img.loading === 'lazy') {
    return false
  }

  const rect = img.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return false
  }

  const viewHeight = window.innerHeight || 900
  const inCriticalViewport = rect.bottom > -120 && rect.top < viewHeight * 1.35
  return inCriticalViewport
}

const collectCriticalImages = () => {
  const root = document.getElementById('root')
  if (!root) {
    return []
  }

  return Array.from(root.querySelectorAll('img')).filter(isCriticalImage)
}

const hasRouteCriticalBlocker = () => {
  const root = document.getElementById('root')
  if (!root) {
    return false
  }

  return Boolean(root.querySelector('[data-route-critical-loading="true"]'))
}

const hasPendingCriticalImages = () => {
  const images = collectCriticalImages()
  return images.some((img) => !img.complete)
}

function GlobalRouteLoader() {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(true)
  const runIdRef = useRef(0)

  useEffect(() => {
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    setIsVisible(true)

    const startedAt = performance.now()
    let isCancelled = false

    const isCurrentRun = () => !isCancelled && runIdRef.current === runId

    const run = async () => {
      await wait(0)
      await wait(0)

      if (!isCurrentRun()) {
        return
      }

      await waitForDocumentReady()
      await waitForFonts()

      await new Promise((resolve) => {
        let resolved = false
        let intervalId = null
        let safetyTimeoutId = null

        const finish = () => {
          if (resolved) {
            return
          }
          resolved = true

          document.removeEventListener('load', evaluate, true)
          document.removeEventListener('error', evaluate, true)
          document.removeEventListener('readystatechange', evaluate)
          window.removeEventListener('resize', evaluate)

          if (intervalId) {
            window.clearInterval(intervalId)
          }
          if (safetyTimeoutId) {
            window.clearTimeout(safetyTimeoutId)
          }

          observer.disconnect()
          resolve()
        }

        const evaluate = () => {
          if (!isCurrentRun()) {
            finish()
            return
          }

          if (!hasRouteCriticalBlocker() && !hasPendingCriticalImages()) {
            finish()
          }
        }

        const observer = new MutationObserver(() => {
          evaluate()
        })

        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['src', 'srcset', 'data-route-critical-loading'],
        })

        document.addEventListener('load', evaluate, true)
        document.addEventListener('error', evaluate, true)
        document.addEventListener('readystatechange', evaluate)
        window.addEventListener('resize', evaluate)

        intervalId = window.setInterval(evaluate, 120)
        safetyTimeoutId = window.setTimeout(() => {
          finish()
        }, hardSafetyTimeoutMs)

        evaluate()
      })

      if (!isCurrentRun()) {
        return
      }

      const elapsed = performance.now() - startedAt
      if (elapsed < minVisibleMs) {
        await wait(minVisibleMs - elapsed)
      }

      if (isCurrentRun()) {
        setIsVisible(false)
      }
    }

    run()

    return () => {
      isCancelled = true
    }
  }, [location.pathname, location.search, location.hash])

  return <GraffitiLoader isVisible={isVisible} />
}

export default GlobalRouteLoader