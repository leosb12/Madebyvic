import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { FiEdit2, FiEye, FiX } from 'react-icons/fi'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { useAuth } from './context/AuthContext'
import { supabase, supabaseReady } from './lib/supabase'

const services = [
  {
    title: 'Canvas Art',
    description:
      'Premium canvas artwork designed to transform spaces through bold creativity and refined detail. Blending graffiti street art influence with refined fine line portraits, each piece delivers a bold yet sophisticated visual presence.',
  },
  {
    title: 'Commissioned Art',
    description:
      'Custom commissioned artwork created exclusively for you, bringing your vision to life across any medium from canvas and sneakers to apparel and unique one of one pieces. Each creation is handcrafted with my signature touch, blending bold creativity, refined detail, and personal expression. Every piece is designed to reflect individuality, tell a story, and elevate the space, style, or lifestyle it inhabits, turning ideas into striking, unforgettable art.',
  },
  {
    title: 'Mural Art',
    description:
      'Specializing in large-scale wall art designed to transform spaces and leave a lasting impression. From businesses and gyms to restaurants and private homes, each mural is custom-created to reflect the atmosphere, brand, or story behind the space. Every piece is thoughtfully designed and hand-painted to elevate the environment with powerful visual impact and timeless artistry.',
  },
]

const process = [
  {
    label: 'THE VISION',
    text: 'Every great mural begins with a vision. During this stage we discuss your ideas, inspiration, and the atmosphere you want the artwork to create. Whether it is a business wall, home space, or large exterior mural, I work closely with you to understand your style, brand, and message. This step ensures the final piece reflects your personality and transforms the space into something unforgettable.',
  },
  {
    label: 'CONCEPT DESIGN',
    text: 'Once the vision is clear, I begin creating the concept design. This includes sketching the composition, developing the layout, and planning the colors and overall flow of the mural. You will receive a visual concept so you can see how the artwork will look before painting begins. Adjustments can be made to make sure every detail is exactly how you imagined.',
  },
  {
    label: "LET'S CREATE",
    text: 'After the concept is approved, the transformation begins. The mural is carefully brought to life using high-quality materials and professional techniques to ensure durability and impact. Each piece is hand-painted with attention to detail, turning your wall into a unique work of art that stands out and leaves a lasting impression.',
  },
]

const defaultBannerSpeedMs = 5200
const heroBucket = (import.meta.env.VITE_SUPABASE_HERO_BUCKET || 'hero-banners').trim()
const bannersPerPage = 3

const buildUniqueFileName = (fileName, existingNames) => {
  const dotIndex = fileName.lastIndexOf('.')
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : ''

  let candidate = `${base}${ext}`
  let suffix = 1

  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${base}(${suffix})${ext}`
    suffix += 1
  }

  return candidate
}

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })

const getCroppedBlob = async (imageSrc, cropPixels, outputType = 'image/jpeg') => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not prepare canvas context for crop.')
  }

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate cropped image.'))
          return
        }
        resolve(blob)
      },
      outputType,
      0.92,
    )
  })
}

function ImagePlaceholder({ label, ratio = 'aspect-[4/3]' }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-sm border border-white/20 bg-white/[0.03] ${ratio}`}
      aria-label={`${label} placeholder`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.16),transparent_40%),linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      <div className="absolute inset-0 place-content-center place-items-center text-center">
        <p className="display-font text-xs tracking-[0.32em] text-white/70 sm:text-sm">
          {label}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/45 sm:text-xs">
          Space reserved for your image
        </p>
      </div>
    </div>
  )
}

function SectionIntro({ tag, title, children }) {
  return (
    <div className="reveal max-w-4xl">
      <p className="display-font text-xs tracking-[0.34em] text-white/60">{tag}</p>
      <h2 className="display-font mt-3 text-balance text-3xl uppercase tracking-[0.06em] text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-5 max-w-3xl text-pretty text-sm leading-relaxed text-white/75 sm:text-base">
        {children}
      </p>
    </div>
  )
}

function App() {
  const [activeBanner, setActiveBanner] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [bannerItems, setBannerItems] = useState([])
  const [bannerSpeedMs, setBannerSpeedMs] = useState(defaultBannerSpeedMs)
  const [loadingBannerConfig, setLoadingBannerConfig] = useState(false)
  const [savingBannerConfig, setSavingBannerConfig] = useState(false)
  const [uploadingBannerFile, setUploadingBannerFile] = useState(false)
  const [selectedBannerFileName, setSelectedBannerFileName] = useState('No file selected')
  const [pendingBannerFile, setPendingBannerFile] = useState(null)
  const [pendingBannerPreviewUrl, setPendingBannerPreviewUrl] = useState('')
  const [showCropModal, setShowCropModal] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [speedInputSeconds, setSpeedInputSeconds] = useState(String(Math.round(defaultBannerSpeedMs / 1000)))
  const [bannerAdminMessage, setBannerAdminMessage] = useState('')
  const [bannerAdminError, setBannerAdminError] = useState('')
  const [showBannerAdmin, setShowBannerAdmin] = useState(false)
  const [bannerPage, setBannerPage] = useState(1)
  const [previewBannerUrl, setPreviewBannerUrl] = useState('')
  const [previewBannerName, setPreviewBannerName] = useState('')
  const bannerFileInputRef = useRef(null)
  const { user, profile, loading } = useAuth()

  const isAdmin = profile?.is_admin === true
  const visibleBanners = bannerItems.filter((item) => item.is_active).map((item) => item.image_url)
  const heroBanners = visibleBanners
  const totalBannerPages = Math.max(1, Math.ceil(bannerItems.length / bannersPerPage))
  const clampedBannerPage = Math.min(bannerPage, totalBannerPages)
  const pageStart = (clampedBannerPage - 1) * bannersPerPage
  const paginatedBannerItems = bannerItems.slice(pageStart, pageStart + bannersPerPage)
  const shouldLockPageScroll = isMobileMenuOpen || showBannerAdmin || showCropModal

  useEffect(() => {
    if (heroBanners.length <= 1) {
      setActiveBanner(0)
      return
    }

    const interval = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % heroBanners.length)
    }, bannerSpeedMs)

    return () => window.clearInterval(interval)
  }, [heroBanners.length, bannerSpeedMs])

  useEffect(() => {
    setActiveBanner(0)
  }, [heroBanners.length])

  useEffect(() => {
    document.body.style.overflow = shouldLockPageScroll ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [shouldLockPageScroll])

  const fullName = profile?.full_name || user?.user_metadata?.full_name || ''
  const firstName = fullName.trim().split(/\s+/)[0] || 'Profile'
  const closeMobileMenu = () => setIsMobileMenuOpen(false)
  const closeBannerPreview = () => {
    setPreviewBannerUrl('')
    setPreviewBannerName('')
  }

  useEffect(() => {
    if (!isAdmin) {
      setShowBannerAdmin(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (bannerPage > totalBannerPages) {
      setBannerPage(totalBannerPages)
    }
  }, [bannerPage, totalBannerPages])

  useEffect(() => {
    return () => {
      if (pendingBannerPreviewUrl) {
        URL.revokeObjectURL(pendingBannerPreviewUrl)
      }
    }
  }, [pendingBannerPreviewUrl])

  const clearBannerFeedback = () => {
    setBannerAdminError('')
    setBannerAdminMessage('')
  }

  const extractStoragePathFromPublicUrl = (publicUrl) => {
    if (!publicUrl || typeof publicUrl !== 'string') {
      return null
    }

    const marker = `/object/public/${heroBucket}/`
    const index = publicUrl.indexOf(marker)

    if (index === -1) {
      return null
    }

    const path = publicUrl.slice(index + marker.length)
    return path || null
  }

  const getBannerDisplayName = (imageUrl) => {
    const storagePath = extractStoragePathFromPublicUrl(imageUrl)
    if (storagePath) {
      const parts = storagePath.split('/').filter(Boolean)
      return decodeURIComponent(parts[parts.length - 1] || storagePath)
    }

    try {
      const url = new URL(imageUrl)
      const parts = url.pathname.split('/').filter(Boolean)
      return decodeURIComponent(parts[parts.length - 1] || imageUrl)
    } catch {
      return imageUrl
    }
  }

  const loadBannerConfig = async () => {
    if (!supabaseReady || !supabase) {
      return
    }

    setLoadingBannerConfig(true)

    const [imagesResponse, settingsResponse] = await Promise.all([
      supabase
        .schema('app')
        .from('hero_images')
        .select('id, image_url, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.schema('app').from('hero_settings').select('rotation_interval_ms').eq('id', 1).maybeSingle(),
    ])

    if (!imagesResponse.error && Array.isArray(imagesResponse.data)) {
      setBannerItems(imagesResponse.data)
    }

    if (!settingsResponse.error && settingsResponse.data?.rotation_interval_ms) {
      const safeSpeed = Math.max(1200, Number(settingsResponse.data.rotation_interval_ms) || defaultBannerSpeedMs)
      setBannerSpeedMs(safeSpeed)
      setSpeedInputSeconds(String(Math.round(safeSpeed / 1000)))
    }

    setLoadingBannerConfig(false)
  }

  useEffect(() => {
    loadBannerConfig()
  }, [])

  const handleBannerFileSelect = (event) => {
    clearBannerFeedback()

    if (!isAdmin) {
      setBannerAdminError('No tienes permisos para editar banners.')
      return
    }

    if (!supabaseReady || !supabase) {
      setBannerAdminError('Servicio temporalmente no disponible.')
      return
    }

    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedBannerFileName(file.name)

    if (!file.type.startsWith('image/')) {
      setBannerAdminError('Only image files are allowed.')
      event.target.value = ''
      return
    }

    if (file.size > 12 * 1024 * 1024) {
      setBannerAdminError('Image is too large. Max size is 12MB.')
      event.target.value = ''
      return
    }

    if (pendingBannerPreviewUrl) {
      URL.revokeObjectURL(pendingBannerPreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setPendingBannerFile(file)
    setPendingBannerPreviewUrl(previewUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setShowCropModal(true)
    event.target.value = ''
  }

  const handleConfirmCroppedUpload = async () => {
    clearBannerFeedback()

    if (!pendingBannerFile || !pendingBannerPreviewUrl || !croppedAreaPixels) {
      setBannerAdminError('Select and crop an image before uploading.')
      return
    }

    const maxSortOrder = bannerItems.reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0)
    setSavingBannerConfig(true)
    setUploadingBannerFile(true)

    try {
      const outputType = pendingBannerFile.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const croppedBlob = await getCroppedBlob(pendingBannerPreviewUrl, croppedAreaPixels, outputType)

      const cleanFileName = pendingBannerFile.name.replace(/[\\/]+/g, '_').trim() || 'banner-image.jpg'
      const existingNames = new Set(
        bannerItems
          .map((item) => getBannerDisplayName(item.image_url))
          .filter(Boolean)
          .map((name) => name.toLowerCase()),
      )
      const uniqueFileName = buildUniqueFileName(cleanFileName, existingNames)
      const objectPath = `hero/${user?.id || 'admin'}/${uniqueFileName}`

      const { error: uploadError } = await supabase.storage.from(heroBucket).upload(objectPath, croppedBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: outputType,
      })

      if (uploadError) {
        setBannerAdminError(uploadError.message)
        return
      }

      const { data: publicUrlData } = supabase.storage.from(heroBucket).getPublicUrl(objectPath)
      const imageUrl = publicUrlData?.publicUrl

      if (!imageUrl) {
        setBannerAdminError('Could not build public URL for uploaded image.')
        return
      }

      const { error } = await supabase.schema('app').from('hero_images').insert({
        image_url: imageUrl,
        sort_order: maxSortOrder + 1,
        is_active: true,
      })

      if (error) {
        const permissionDenied = error.message?.toLowerCase().includes('permission denied')
        setBannerAdminError(
          permissionDenied ? 'No tienes permisos para modificar banners.' : 'No se pudo guardar el banner.',
        )
        return
      }

      setBannerAdminMessage('Banner image uploaded and added.')
      await loadBannerConfig()
      setShowCropModal(false)
      setPendingBannerFile(null)
      if (pendingBannerPreviewUrl) {
        URL.revokeObjectURL(pendingBannerPreviewUrl)
      }
      setPendingBannerPreviewUrl('')
    } catch (error) {
      setBannerAdminError(error?.message || 'Unexpected error while cropping/uploading image.')
    } finally {
      setSavingBannerConfig(false)
      setUploadingBannerFile(false)
    }
  }

  const handleRemoveBanner = async (item) => {
    clearBannerFeedback()

    if (!isAdmin) {
      setBannerAdminError('No tienes permisos para editar banners.')
      return
    }

    if (!supabaseReady || !supabase) {
      setBannerAdminError('Servicio temporalmente no disponible.')
      return
    }

    setSavingBannerConfig(true)

    const storagePath = extractStoragePathFromPublicUrl(item.image_url)

    if (storagePath) {
      await supabase.storage.from(heroBucket).remove([storagePath])
    }

    const { error } = await supabase.schema('app').from('hero_images').delete().eq('id', item.id)

    if (error) {
      const permissionDenied = error.message?.toLowerCase().includes('permission denied')
      setBannerAdminError(
        permissionDenied ? 'No tienes permisos para modificar banners.' : 'No se pudo eliminar el banner.',
      )
      setSavingBannerConfig(false)
      return
    }

    setBannerAdminMessage('Banner removed.')
    await loadBannerConfig()
    setSavingBannerConfig(false)
  }

  const handleSaveSpeed = async () => {
    clearBannerFeedback()

    if (!isAdmin) {
      setBannerAdminError('No tienes permisos para editar banners.')
      return
    }

    if (!supabaseReady || !supabase) {
      setBannerAdminError('Servicio temporalmente no disponible.')
      return
    }

    const seconds = Number(speedInputSeconds)
    if (!Number.isFinite(seconds) || seconds < 1.2 || seconds > 30) {
      setBannerAdminError('Speed must be between 1.2 and 30 seconds.')
      return
    }

    const rotationIntervalMs = Math.round(seconds * 1000)
    setSavingBannerConfig(true)

    const { error } = await supabase
      .schema('app')
      .from('hero_settings')
      .upsert({ id: 1, rotation_interval_ms: rotationIntervalMs }, { onConflict: 'id' })

    if (error) {
      const permissionDenied = error.message?.toLowerCase().includes('permission denied')
      setBannerAdminError(
        permissionDenied ? 'No tienes permisos para cambiar la velocidad.' : 'No se pudo guardar la velocidad.',
      )
      setSavingBannerConfig(false)
      return
    }

    setBannerSpeedMs(rotationIntervalMs)
    setBannerAdminMessage('Rotation speed updated.')
    setSavingBannerConfig(false)
  }

  return (
    <div className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-black text-white selection:bg-white selection:text-black">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.13),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.11),transparent_32%)]" />

      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-7 lg:px-10">
          <a href="#home" className="display-font z-50 shrink-0 text-lg tracking-[0.18em] text-white">
            MADE BY VIC
          </a>
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
            <a href="#services" className="story-link">
              SERVICES
            </a>
            <a href="#murals" className="story-link">
              MURALS
            </a>
            <a href="#digital-design" className="story-link">
              DIGITAL
            </a>
            <a href="#contact" className="story-link">
              CONTACT
            </a>
            {user && !loading ? (
              <Link to="/profile" className="story-link nav-user-link">
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
              <Link to="/sign-in" className="story-link">
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
            <a href="#services" className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>SERVICES</a>
            <a href="#murals" className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>MURALS</a>
            <a href="#digital-design" className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>DIGITAL</a>
            <a href="#contact" className="border border-white/10 p-4 font-display text-[0.8rem] uppercase tracking-[0.18em] text-white/90 active:bg-white/5" onClick={closeMobileMenu}>CONTACT</a>
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

      <main>
        <section id="home" className="relative isolate min-h-[calc(100vh-73px)] overflow-hidden border-b border-white/15">
          {isAdmin ? (
            <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/30 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/75"
                onClick={() => {
                  clearBannerFeedback()
                  setShowBannerAdmin((prev) => !prev)
                }}
                aria-label={showBannerAdmin ? 'Close banner settings' : 'Open banner settings'}
                title={showBannerAdmin ? 'Close banner settings' : 'Edit banner'}
              >
                {showBannerAdmin ? <FiX size={17} /> : <FiEdit2 size={16} />}
              </button>
            </div>
          ) : null}

          {isAdmin && showBannerAdmin ? (
            <div className="fixed inset-x-3 top-[88px] z-40 max-h-[calc(100dvh-100px)] sm:inset-x-6 sm:top-[96px] sm:max-h-[calc(100dvh-112px)] lg:inset-x-auto lg:right-8 lg:w-[560px]">
              <div className="flex max-h-full flex-col overflow-hidden rounded-sm border border-white/20 bg-black/85 backdrop-blur-md">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/90 px-5 py-4">
                  <p className="display-font text-[11px] tracking-[0.2em] text-white/70">ADMIN BANNER SETTINGS</p>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                    onClick={() => setShowBannerAdmin(false)}
                    aria-label="Cerrar panel"
                    title="Cerrar"
                  >
                    <FiX size={15} />
                  </button>
                </div>
                <div className="overflow-y-auto px-5 pb-5 max-h-[calc(100dvh-176px)] sm:max-h-[calc(100dvh-188px)]">
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <label className="field-wrap">
                      <span>Upload image</span>
                      <input
                        ref={bannerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileSelect}
                        disabled={savingBannerConfig || uploadingBannerFile}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="action-btn action-btn-outline"
                          onClick={() => bannerFileInputRef.current?.click()}
                          disabled={savingBannerConfig || uploadingBannerFile}
                        >
                          Choose File
                        </button>
                        <p className="truncate text-sm text-white/70">{selectedBannerFileName}</p>
                      </div>
                    </label>
                    <div className="hidden md:block" />
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    Recommendation: use images under 1MB for faster loading and better performance.
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-[160px_auto] md:items-end">
                    <label className="field-wrap">
                      <span>Speed (seconds)</span>
                      <input
                        type="number"
                        min="1.2"
                        max="30"
                        step="0.1"
                        value={speedInputSeconds}
                        onChange={(event) => setSpeedInputSeconds(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="action-btn action-btn-outline justify-center"
                      onClick={handleSaveSpeed}
                      disabled={savingBannerConfig}
                    >
                      Save Speed
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 pr-1">
                    {(loadingBannerConfig ? [] : paginatedBannerItems).map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/30 px-3 py-2"
                      >
                        <p className="min-w-0 flex-1 truncate text-sm text-white/80">{getBannerDisplayName(item.image_url)}</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/25 bg-black/50 text-white transition hover:border-white/70 hover:bg-black/80"
                              onClick={() => {
                                setPreviewBannerUrl(item.image_url)
                                setPreviewBannerName(getBannerDisplayName(item.image_url))
                              }}
                              aria-label="Preview banner image"
                              title="Preview image"
                            >
                              <FiEye size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn action-btn-outline"
                              onClick={() => handleRemoveBanner(item)}
                              disabled={savingBannerConfig}
                            >
                              Remove
                            </button>
                          </div>
                      </div>
                    ))}
                    {!loadingBannerConfig && bannerItems.length === 0 ? (
                      <p className="text-sm text-white/65">No hay imagenes.</p>
                    ) : null}
                  </div>

                  {!loadingBannerConfig && bannerItems.length > 0 ? (
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        className="action-btn action-btn-outline"
                        onClick={() => setBannerPage((current) => Math.max(1, current - 1))}
                        disabled={clampedBannerPage === 1}
                      >
                        Previous
                      </button>
                      <p className="text-xs uppercase tracking-[0.12em] text-white/70">
                        Page {clampedBannerPage} / {totalBannerPages}
                      </p>
                      <button
                        type="button"
                        className="action-btn action-btn-outline"
                        onClick={() => setBannerPage((current) => Math.min(totalBannerPages, current + 1))}
                        disabled={clampedBannerPage === totalBannerPages}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}

                  {bannerAdminError ? <p className="mt-3 text-sm text-red-300">{bannerAdminError}</p> : null}
                  {bannerAdminMessage ? <p className="mt-3 text-sm text-emerald-300">{bannerAdminMessage}</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          {isAdmin && showCropModal ? (
            <div className="fixed inset-x-0 bottom-0 top-[73px] z-40 bg-black/80 p-4 backdrop-blur-sm sm:p-6">
              <div className="mx-auto flex h-full w-full max-w-3xl flex-col rounded-sm border border-white/20 bg-black/85 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="display-font text-xs tracking-[0.2em] text-white/70">CONFIRM BANNER CROP</p>
                    <p className="mt-1 text-sm text-white/75">Please crop the image to a 16:9 frame before upload.</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/50 text-white"
                    onClick={() => {
                      setShowCropModal(false)
                      setPendingBannerFile(null)
                      if (pendingBannerPreviewUrl) {
                        URL.revokeObjectURL(pendingBannerPreviewUrl)
                      }
                      setPendingBannerPreviewUrl('')
                    }}
                    aria-label="Close crop modal"
                  >
                    <FiX size={16} />
                  </button>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm border border-white/20 bg-black/70">
                  <Cropper
                    image={pendingBannerPreviewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={16 / 9}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_croppedArea, pixels) => setCroppedAreaPixels(pixels)}
                    showGrid
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <label className="field-wrap">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    className="action-btn action-btn-solid justify-center"
                    onClick={handleConfirmCroppedUpload}
                    disabled={savingBannerConfig || uploadingBannerFile || !croppedAreaPixels}
                  >
                    {uploadingBannerFile ? 'Uploading...' : 'Confirm and Upload'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isAdmin && previewBannerUrl
            ? createPortal(
                <div
                  className="fixed inset-x-0 bottom-0 top-[73px] z-[120] bg-black/80 p-4 backdrop-blur-sm sm:p-6"
                  onClick={closeBannerPreview}
                >
                  <button
                    type="button"
                    className="fixed right-4 top-[88px] z-[130] inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/35 bg-black/70 text-white transition hover:border-white/80 hover:bg-black/90"
                    onClick={closeBannerPreview}
                    aria-label="Close image preview"
                    title="Close"
                  >
                    <FiX size={18} />
                  </button>
                  <div
                    className="mx-auto mt-2 w-full max-w-5xl overflow-hidden rounded-sm border border-white/20 bg-black/90"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <p className="truncate text-sm uppercase tracking-[0.12em] text-white/75">{previewBannerName || 'Preview'}</p>
                      <span className="inline-flex h-9 w-9" aria-hidden="true" />
                    </div>
                    <div className="max-h-[calc(100dvh-170px)] overflow-auto p-4">
                      <img
                        src={previewBannerUrl}
                        alt={previewBannerName || 'Banner preview'}
                        className="mx-auto block h-auto max-h-[calc(100dvh-210px)] w-full object-contain"
                      />
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

          {heroBanners.map((banner, index) => (
            <img
              key={banner}
              src={banner}
              alt={index === 0 ? 'Made by Vic hero background 1' : 'Made by Vic hero background 2'}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[1800ms] ease-in-out ${
                activeBanner === index ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.6)_42%,rgba(0,0,0,0.34)_100%)]" />

          <div className="relative mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-7xl items-end px-5 pb-16 pt-20 sm:px-7 sm:pb-20 lg:px-10 lg:pt-28">
            <div className="reveal max-w-3xl">
              <p className="display-font text-xs tracking-[0.36em] text-white/60">WELCOME</p>
              <h1 className="display-font mt-4 text-balance text-5xl uppercase leading-[0.9] tracking-[0.04em] sm:text-7xl lg:text-8xl">
                Made by Vic
              </h1>
              <p className="mt-8 max-w-2xl text-pretty text-sm leading-relaxed text-white/75 sm:text-base">
                Welcome to my Digital Art Gallery, a curated space where creativity, vision, and craftsmanship come together. Each piece is thoughtfully designed to capture emotion, tell a story, and elevate the spaces it lives in. From original artworks to limited edition prints, every creation reflects a commitment to detail, originality, and artistic expression.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="#contact" className="action-btn action-btn-solid">
                  Start Your Project
                </a>
                <a href="#murals" className="action-btn action-btn-outline">
                  Explore Murals
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <SectionIntro tag="THE SERVICES" title="Art That Defines Spaces">
            Every service is built around your idea, your environment, and your story. The goal is simple: create visual pieces that feel unique, intentional, and unforgettable.
          </SectionIntro>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <article
                key={service.title}
                className="reveal-card group rounded-sm border border-white/15 bg-white/[0.03] p-6 transition duration-500 hover:border-white/40 hover:bg-white/[0.06]"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <p className="display-font text-xs tracking-[0.25em] text-white/50">0{index + 1}</p>
                <h3 className="display-font mt-4 text-2xl uppercase tracking-[0.06em]">{service.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/75">{service.description}</p>
                <div className="mt-6">
                  <ImagePlaceholder label={`${service.title.toUpperCase()} IMAGE`} ratio="aspect-[16/10]" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="murals" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <SectionIntro tag="MURALS BY VIC" title="Mural Art by Vic">
                Specializing in large-scale wall art designed to transform spaces and leave a lasting impression. From businesses and gyms to restaurants and private homes, each mural is custom-created to reflect the atmosphere, brand, or story behind the space. Every piece is thoughtfully designed and hand-painted to elevate the environment with powerful visual impact and timeless artistry.
              </SectionIntro>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <ImagePlaceholder label="MURAL PROJECT 01" ratio="aspect-[4/5]" />
                <ImagePlaceholder label="MURAL PROJECT 02" ratio="aspect-[4/5]" />
              </div>
            </div>

            <div className="space-y-4">
              {process.map((item, index) => (
                <article
                  key={item.label}
                  className="reveal-card rounded-sm border border-white/15 bg-white/[0.03] p-6"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <p className="display-font text-xs tracking-[0.28em] text-white/50">STEP {index + 1}</p>
                  <h3 className="display-font mt-3 text-2xl uppercase tracking-[0.06em]">{item.label}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/75">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <SectionIntro tag="SERVICES" title="My Services">
            When you work with me, you are not just receiving artwork. You are getting a unique artistic experience. Every piece is created with intention, detail, and purpose. Whether it is a custom mural for your business or an original artwork for your home, I focus on capturing your vision and transforming it into something visually powerful, meaningful, and truly one of a kind.
          </SectionIntro>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            <article className="reveal-card rounded-sm border border-white/15 bg-black/30 p-6">
              <h3 className="display-font text-2xl uppercase tracking-[0.07em]">Commissioned Art</h3>
              <h4 className="mt-5 text-xs uppercase tracking-[0.25em] text-white/55">What Is It?</h4>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Commissioned art is a custom artwork created specifically for you. Instead of purchasing a pre-made piece, you collaborate directly with the artist to bring your vision to life. From the concept and subject to the style, colors, and size, every detail is tailored to fit your idea and your space.
              </p>
              <h4 className="mt-6 text-xs uppercase tracking-[0.25em] text-white/55">Why It Matters</h4>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Commissioned artwork allows you to own something truly unique. It reflects your personality, your story, or the atmosphere you want to create in your home or business. Because it is made specifically for you, it becomes more than just decoration. It becomes a meaningful piece of art that holds value and personal connection.
              </p>
            </article>

            <article className="reveal-card rounded-sm border border-white/15 bg-black/30 p-6 [animation-delay:120ms]">
              <h3 className="display-font text-2xl uppercase tracking-[0.07em]">Mural Art</h3>
              <h4 className="mt-5 text-xs uppercase tracking-[0.25em] text-white/55">What Is It?</h4>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Mural art is large-scale artwork painted directly onto walls or surfaces. Murals transform ordinary spaces into immersive visual experiences, turning blank walls into powerful artistic statements. They can be created for businesses, gyms, restaurants, offices, or private homes.
              </p>
              <h4 className="mt-6 text-xs uppercase tracking-[0.25em] text-white/55">Why It Matters</h4>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Murals bring energy, identity, and personality to a space. For businesses, they help create a memorable environment and strengthen brand presence. For homes or private spaces, they add a bold and artistic atmosphere that cannot be replicated with traditional decor.
              </p>
            </article>

            <article className="reveal-card rounded-sm border border-white/15 bg-black/30 p-6 [animation-delay:240ms]">
              <h3 className="display-font text-2xl uppercase tracking-[0.07em]">Canvas Art</h3>
              <h4 className="mt-5 text-xs uppercase tracking-[0.25em] text-white/55">What Is It?</h4>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Canvas art refers to original paintings created on stretched canvas. These artworks can range from small statement pieces to large focal works designed to enhance the aesthetic of a room. Each canvas is hand-painted, making every piece unique.
              </p>
              <h4 className="mt-6 text-xs uppercase tracking-[0.25em] text-white/55">Why It Matters</h4>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Canvas art adds character and artistic depth to a space. Unlike mass-produced prints, original canvas artwork carries the artist touch, creativity, and authenticity. It creates a visual focal point while giving your space a more personal and elevated feel.
              </p>
            </article>
          </div>

          <p className="reveal display-font mt-10 text-center text-sm tracking-[0.28em] text-white/60">
            Instagram · @_madeby.Vic
          </p>
        </section>

        <section id="digital-design" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <SectionIntro tag="DIGITAL DESIGN" title="Brand Visuals With Attitude">
            Digital design is more than just graphics. It is about building a recognizable identity. I design custom logos, brand visuals, and apparel graphics that help businesses create a strong and professional presence. Whether it is a logo for a new brand or custom t-shirt designs for merchandise, every design is created to make your brand memorable and visually impactful.
          </SectionIntro>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="reveal-card rounded-sm border border-white/15 bg-white/[0.03] p-7">
              <h3 className="display-font text-3xl uppercase tracking-[0.07em]">Logo Projects</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                Your logo sets the tone for your whole brand and becomes your signature. I design bold, eye-catching logos that tell your story and match your vibe. From clean and minimal to street-inspired and edgy, every logo is made to stand out and represent your brand with style.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ImagePlaceholder label="LOGO CONCEPT A" ratio="aspect-square" />
                <ImagePlaceholder label="LOGO CONCEPT B" ratio="aspect-square" />
              </div>
            </article>

            <article className="reveal-card rounded-sm border border-white/15 bg-white/[0.03] p-7 [animation-delay:120ms]">
              <h3 className="display-font text-3xl uppercase tracking-[0.07em]">Apparel Design</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                Custom apparel designs created to turn clothing into wearable art. From t-shirt graphics to full clothing concepts, each design is crafted with creativity, detail, and originality. Whether you are building a brand, launching merchandise, or looking for a unique design, every piece is made to stand out and represent your vision with style.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ImagePlaceholder label="APPAREL MOCKUP 01" ratio="aspect-[4/5]" />
                <ImagePlaceholder label="APPAREL MOCKUP 02" ratio="aspect-[4/5]" />
              </div>
            </article>
          </div>
        </section>

        <section id="contact" className="mx-auto w-full max-w-7xl px-5 pb-24 pt-20 sm:px-7 lg:px-10">
          <div className="relative overflow-hidden rounded-sm border border-white/20 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_45%,rgba(255,255,255,0.1))] p-8 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:32px_32px]" />

            <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div className="reveal">
                <p className="display-font text-xs tracking-[0.32em] text-white/65">LET'S CONNECT</p>
                <h2 className="display-font mt-4 text-balance text-4xl uppercase tracking-[0.05em] sm:text-5xl">
                  Let's Create Something Unforgettable
                </h2>
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                  Do you have a question, an idea, or a wall that needs a story? I would love to hear about it. Whether you are interested in a custom painting, mural, apparel design, or a creative collaboration, every project starts with a vision.
                </p>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                  Feel free to reach out. There is no pressure or obligation, just a conversation about your ideas and what we can create together.
                </p>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                  Fill out the form or send me a direct message, and I will get back to you as soon as possible. I am always open to new ideas and exciting projects.
                </p>
              </div>

              <form className="reveal-delay grid gap-4 rounded-sm border border-white/25 bg-black/45 p-6 backdrop-blur-sm sm:p-7">
                <label className="field-wrap">
                  <span>Name</span>
                  <input type="text" name="name" placeholder="Your name" />
                </label>
                <label className="field-wrap">
                  <span>Email</span>
                  <input type="email" name="email" placeholder="you@email.com" />
                </label>
                <label className="field-wrap">
                  <span>Service</span>
                  <select name="service" defaultValue="">
                    <option value="" disabled>
                      Select one option
                    </option>
                    <option>Commissioned Art</option>
                    <option>Mural Art</option>
                    <option>Canvas Art</option>
                    <option>Logo Projects</option>
                    <option>Apparel Design</option>
                  </select>
                </label>
                <label className="field-wrap">
                  <span>Project Details</span>
                  <textarea
                    name="message"
                    rows="5"
                    placeholder="Tell me your idea, style, dimensions, and deadline"
                  />
                </label>
                <button type="button" className="action-btn action-btn-solid mt-2 w-full justify-center">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
