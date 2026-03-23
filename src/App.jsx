import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiEdit2, FiEye, FiX } from 'react-icons/fi'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { useAuth } from './context/AuthContext'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import { supabase, supabaseReady } from './lib/supabase'

const serviceDefinitions = [
  {
    key: 'canvas-art',
    title: 'Canvas Art',
    description:
      'Premium canvas artwork designed to transform spaces through bold creativity and refined detail. Blending graffiti street art influence with refined fine line portraits, each piece delivers a bold yet sophisticated visual presence.',
  },
  {
    key: 'commissioned-art',
    title: 'Commissioned Art',
    description:
      'Custom commissioned artwork created exclusively for you, bringing your vision to life across any medium from canvas and sneakers to apparel and unique one of one pieces. Each creation is handcrafted with my signature touch, blending bold creativity, refined detail, and personal expression. Every piece is designed to reflect individuality, tell a story, and elevate the space, style, or lifestyle it inhabits, turning ideas into striking, unforgettable art.',
  },
  {
    key: 'mural-art',
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

const clientReviews = [
  {
    id: 'review-01',
    name: 'Carla M.',
    context: 'Owner, Boutique Gym - Miami',
    service: 'Mural Art',
    rating: '5/5',
    date: 'Feb 2026',
    text: 'We gave him an empty wall and got back a signature piece that changed the energy of the entire gym. Process was clean, fast, and very professional.',
  },
  {
    id: 'review-02',
    name: 'Daniel R.',
    context: 'Restaurant Partner - Brickell',
    service: 'Commissioned Art',
    rating: '5/5',
    date: 'Jan 2026',
    text: 'We needed something elegant with street character. The final piece did exactly that. New guests ask about it almost every night.',
  },
  {
    id: 'review-03',
    name: 'Sofia T.',
    context: 'Creative Director - DTC Brand',
    service: 'Logo + Apparel',
    rating: '5/5',
    date: 'Dec 2025',
    text: 'He did not just design a logo, he built a full visual language for our brand. The merch looked incredible and our first drop sold out in days.',
  },
  {
    id: 'review-04',
    name: 'Martin V.',
    context: 'Private Collector - Coral Gables',
    service: 'Canvas Art',
    rating: '5/5',
    date: 'Nov 2025',
    text: 'I wanted a custom statement piece for my main living room and it exceeded expectations. Strong presence, fine detail, flawless execution.',
  },
  {
    id: 'review-05',
    name: 'Nadia P.',
    context: 'Co-Founder, Beauty Studio - Wynwood',
    service: 'Mural Art',
    rating: '5/5',
    date: 'Oct 2025',
    text: 'Our studio finally feels like a brand, not just a location. The mural became our most photographed corner and helped organic traffic a lot.',
  },
  {
    id: 'review-06',
    name: 'Julian K.',
    context: 'Marketing Lead - Hospitality Group',
    service: 'Commissioned Art',
    rating: '5/5',
    date: 'Sep 2025',
    text: 'Clear communication, strong creative direction, and delivery exactly on schedule. The artwork elevated the full customer experience instantly.',
  },
  {
    id: 'review-07',
    name: 'Emma L.',
    context: 'Founder - Activewear Label',
    service: 'Apparel Design',
    rating: '5/5',
    date: 'Aug 2025',
    text: 'The graphics translated perfectly from concept to fabric. The collection looked premium and authentic, exactly what we wanted for launch.',
  },
  {
    id: 'review-08',
    name: 'Rafael S.',
    context: 'Owner, Modern Barbershop - Downtown',
    service: 'Brand Visuals',
    rating: '5/5',
    date: 'Jul 2025',
    text: 'Every detail felt intentional. The wall art and identity work gave us a distinct look that clients instantly recognize and remember.',
  },
]

const defaultBannerSpeedMs = 5200
const heroBucket = (import.meta.env.VITE_SUPABASE_HERO_BUCKET || 'hero-banners').trim()
const serviceBucket = (import.meta.env.VITE_SUPABASE_SERVICE_BUCKET || 'service-images').trim()
const bannersPerPage = 3
const aboutImageServiceKey = 'about-madebyvic-image'
const defaultHeroIntroText =
  'Welcome to my Digital Art Gallery, a curated space where creativity, vision, and craftsmanship come together. Each piece is thoughtfully designed to capture emotion, tell a story, and elevate the spaces it lives in. From original artworks to limited edition prints, every creation reflects a commitment to detail, originality, and artistic expression.'
const defaultAboutTitle = 'Graffiti Energy, Premium Finish'
const defaultAboutBody =
  'Madebyvic blends street-art attitude with luxury-level detail. Every project starts with your vision and ends as a visual statement that feels authentic, bold, and memorable.\n\nFrom murals and custom canvas pieces to brand visuals and apparel design, each concept is handcrafted to match your identity, your space, and your story.'
const instagramProfileUrl = 'https://www.instagram.com/_madeby.vic/'
const instagramCardSlots = [
  { key: 'instagram-card-01', label: 'POST 01' },
  { key: 'instagram-card-02', label: 'POST 02' },
  { key: 'instagram-card-03', label: 'POST 03' },
  { key: 'instagram-card-04', label: 'POST 04' },
]

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

const normalizeExternalUrl = (value) => {
  const nextValue = String(value || '').trim()
  if (!nextValue) {
    return ''
  }

  if (/^https?:\/\//i.test(nextValue)) {
    return nextValue
  }

  return `https://${nextValue}`
}

const extractInstagramMediaRef = (inputUrl) => {
  try {
    const parsed = new URL(inputUrl)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const mediaTypeIndex = parts.findIndex((part) => ['p', 'reel', 'tv'].includes(part))

    if (mediaTypeIndex === -1 || !parts[mediaTypeIndex + 1]) {
      return null
    }

    return {
      mediaType: parts[mediaTypeIndex],
    }
  } catch {
    return null
  }
}

const buildInstagramImageProxyUrl = (inputUrl) => {
  const raw = String(inputUrl || '').trim()
  if (!raw) {
    return ''
  }

  try {
    const parsed = new URL(raw)
    const targetWithoutProtocol = `${parsed.host}${parsed.pathname}${parsed.search}`
    return `https://images.weserv.nl/?url=${encodeURIComponent(targetWithoutProtocol)}&w=1600&output=jpg`
  } catch {
    return ''
  }
}

const resolveInstagramThumbnailUrl = async (postUrl) => {
  const endpoint = `https://noembed.com/embed?url=${encodeURIComponent(postUrl)}`

  try {
    const response = await fetch(endpoint)

    if (response.ok) {
      const payload = await response.json()
      const thumbnailUrl = String(payload?.thumbnail_url || '').trim()
      if (thumbnailUrl) {
        return thumbnailUrl
      }
    }
  } catch {
    // Fallback below.
  }

  const mediaRef = extractInstagramMediaRef(postUrl)
  if (mediaRef) {
    return `https://www.instagram.com/${mediaRef.mediaType}/${mediaRef.shortcode}/media/?size=l`
  }

  throw new Error('Could not load instagram metadata.')
}

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })

const preloadImage = (url) =>
  new Promise((resolve) => {
    const image = new Image()
    const finish = () => resolve()

    image.onload = finish
    image.onerror = finish
    image.src = url

    if (image.complete) {
      resolve()
    }
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
  const [isHeaderMobileMenuOpen, setIsHeaderMobileMenuOpen] = useState(false)
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
  const [serviceImagesByKey, setServiceImagesByKey] = useState({})
  const [savingServiceImageKey, setSavingServiceImageKey] = useState('')
  const [serviceAdminMessage, setServiceAdminMessage] = useState('')
  const [serviceAdminError, setServiceAdminError] = useState('')
  const [showServiceCropModal, setShowServiceCropModal] = useState(false)
  const [pendingServiceFile, setPendingServiceFile] = useState(null)
  const [pendingServicePreviewUrl, setPendingServicePreviewUrl] = useState('')
  const [pendingServiceKey, setPendingServiceKey] = useState('')
  const [serviceCrop, setServiceCrop] = useState({ x: 0, y: 0 })
  const [serviceZoom, setServiceZoom] = useState(1)
  const [serviceCroppedAreaPixels, setServiceCroppedAreaPixels] = useState(null)
  const [heroIntroText, setHeroIntroText] = useState(defaultHeroIntroText)
  const [heroIntroInput, setHeroIntroInput] = useState(defaultHeroIntroText)
  const [savingHeroIntro, setSavingHeroIntro] = useState(false)
  const [showHeroTextEditor, setShowHeroTextEditor] = useState(false)
  const [aboutTitle, setAboutTitle] = useState(defaultAboutTitle)
  const [aboutBody, setAboutBody] = useState(defaultAboutBody)
  const [aboutImageUrl, setAboutImageUrl] = useState('')
  const [aboutTitleInput, setAboutTitleInput] = useState(defaultAboutTitle)
  const [aboutBodyInput, setAboutBodyInput] = useState(defaultAboutBody)
  const [savingAboutContent, setSavingAboutContent] = useState(false)
  const [showAboutEditor, setShowAboutEditor] = useState(false)
  const [aboutAdminMessage, setAboutAdminMessage] = useState('')
  const [aboutAdminError, setAboutAdminError] = useState('')
  const [instagramLinksByKey, setInstagramLinksByKey] = useState({})
  const [showInstagramLinkEditor, setShowInstagramLinkEditor] = useState(false)
  const [editingInstagramKey, setEditingInstagramKey] = useState('')
  const [instagramLinkInput, setInstagramLinkInput] = useState('')
  const [savingInstagramLink, setSavingInstagramLink] = useState(false)
  const [instagramAdminError, setInstagramAdminError] = useState('')
  const [instagramAdminMessage, setInstagramAdminMessage] = useState('')
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeError, setSubscribeError] = useState('')
  const [subscribeMessage, setSubscribeMessage] = useState('')
  const [homeAnnouncements, setHomeAnnouncements] = useState([])
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false)
  const [initialImagesLoaded, setInitialImagesLoaded] = useState(false)
  const [apparelBlendValue, setApparelBlendValue] = useState(0)
  const bannerFileInputRef = useRef(null)
  const reviewsSliderRef = useRef(null)
  const reviewsIsDraggingRef = useRef(false)
  const reviewsScrollPausedRef = useRef(false)
  const reviewsScrollTimeoutRef = useRef(null)
  const reviewsDragStartXRef = useRef(0)
  const reviewsStartScrollLeftRef = useRef(0)
  const reviewsAutoDirectionRef = useRef(1)
  const lastAutoFilledSubscribeEmailRef = useRef('')
  const { user, canEditAsAdmin } = useAuth()

  const isAdmin = canEditAsAdmin === true
  const visibleBanners = bannerItems.filter((item) => item.is_active).map((item) => item.image_url)
  const heroBanners = visibleBanners
  const serviceImageUrls = useMemo(
    () => Object.values(serviceImagesByKey).map((item) => item?.image_url).filter(Boolean),
    [serviceImagesByKey],
  )
  const services = serviceDefinitions.map((service) => ({
    ...service,
    imageUrl: serviceImagesByKey[service.key]?.image_url || '',
  }))
  const muralGallery = [
    { key: 'mural-project-01', label: 'MURAL PROJECT 01' },
    { key: 'mural-project-02', label: 'MURAL PROJECT 02' },
  ].map((item) => ({
    ...item,
    imageUrl: serviceImagesByKey[item.key]?.image_url || '',
  }))
  const logoConcepts = [
    { key: 'logo-concept-a', label: 'LOGO CONCEPT A', ratio: 'aspect-square' },
    { key: 'logo-concept-b', label: 'LOGO CONCEPT B', ratio: 'aspect-square' },
  ].map((item) => ({
    ...item,
    imageUrl: serviceImagesByKey[item.key]?.image_url || '',
  }))
  const apparelMockups = [
    { key: 'apparel-mockup-01', label: 'Design Image', ratio: 'aspect-square' },
    { key: 'apparel-mockup-02', label: 'T-Shirt Preview', ratio: 'aspect-square' },
  ].map((item) => ({
    ...item,
    imageUrl: serviceImagesByKey[item.key]?.image_url || '',
  }))
  const instagramCards = instagramCardSlots.map((item) => ({
    ...item,
    imageUrl: serviceImagesByKey[item.key]?.image_url || '',
    postUrl: instagramLinksByKey[item.key] || instagramProfileUrl,
  }))
  const visibleAnnouncements = useMemo(
    () => (Array.isArray(homeAnnouncements) ? homeAnnouncements.filter((item) => item?.message) : []),
    [homeAnnouncements],
  )
  const apparelBlendRatio = apparelBlendValue / 100
  const activeApparelIndex = apparelBlendRatio >= 0.5 ? 1 : 0
  const isInitialPageReady = hasInitialDataLoaded && initialImagesLoaded
  const totalBannerPages = Math.max(1, Math.ceil(bannerItems.length / bannersPerPage))
  const clampedBannerPage = Math.min(bannerPage, totalBannerPages)
  const pageStart = (clampedBannerPage - 1) * bannersPerPage
  const paginatedBannerItems = bannerItems.slice(pageStart, pageStart + bannersPerPage)
  const isMuralCrop = pendingServiceKey.startsWith('mural-project-')
  const isLogoCrop = pendingServiceKey.startsWith('logo-concept-')
  const isApparelCrop = pendingServiceKey.startsWith('apparel-mockup-')
  const isInstagramCrop = pendingServiceKey.startsWith('instagram-card-')
  const isAboutCrop = pendingServiceKey === aboutImageServiceKey
  const serviceCropAspect = isAboutCrop ? 3 / 4 : isLogoCrop || isApparelCrop ? 1 : isMuralCrop ? 4 / 5 : isInstagramCrop ? 4 / 3 : 16 / 10
  const serviceCropFormatLabel = isAboutCrop ? '3:4' : isLogoCrop || isApparelCrop ? '1:1' : isMuralCrop ? '4:5' : isInstagramCrop ? '4:3' : '16:10'
  const serviceCropTitle = isLogoCrop
    ? 'Adjust Logo Image'
    : isMuralCrop
      ? 'Adjust Mural Image'
      : isInstagramCrop
        ? 'Adjust Instagram Card'
      : isApparelCrop
        ? 'Adjust Apparel Image'
        : isAboutCrop
          ? 'Adjust About Image'
          : 'Adjust Service Image'
  const shouldLockPageScroll =
    !isInitialPageReady ||
    isHeaderMobileMenuOpen ||
    showBannerAdmin ||
    showCropModal ||
    showHeroTextEditor ||
    showAboutEditor ||
    showServiceCropModal ||
    showInstagramLinkEditor

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

  const closeBannerPreview = () => {
    setPreviewBannerUrl('')
    setPreviewBannerName('')
  }

  useEffect(() => {
    if (!isAdmin) {
      setShowBannerAdmin(false)
      setShowHeroTextEditor(false)
      setShowAboutEditor(false)
      setShowInstagramLinkEditor(false)
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
      if (pendingServicePreviewUrl) {
        URL.revokeObjectURL(pendingServicePreviewUrl)
      }
    }
  }, [pendingBannerPreviewUrl, pendingServicePreviewUrl])

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
      return []
    }

    setLoadingBannerConfig(true)

    const [imagesResponse, settingsResponse, introResponse, serviceImagesResponse, aboutResponse, instagramLinksResponse, announcementsResponse] = await Promise.all([
      supabase
        .schema('app')
        .from('hero_images')
        .select('id, image_url, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.schema('app').from('hero_settings').select('rotation_interval_ms').eq('id', 1).maybeSingle(),
      supabase.schema('app').from('hero_content').select('intro_text').eq('id', 1).maybeSingle(),
      supabase
        .schema('app')
        .from('service_images')
        .select('id, service_key, image_url')
        .order('created_at', { ascending: false }),
      supabase
        .schema('app')
        .from('about_content')
        .select('about_title, about_body, image_url')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .schema('app')
        .from('instagram_cards')
        .select('slot_key, post_url')
        .order('slot_key', { ascending: true }),
      supabase
        .schema('app')
        .from('site_announcements')
        .select('id, message, is_active, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false }),
    ])

    const hasBannerRows = !imagesResponse.error && Array.isArray(imagesResponse.data)
    const nextBannerItems = hasBannerRows ? imagesResponse.data : []
    if (hasBannerRows) {
      setBannerItems(nextBannerItems)
    }

    if (!settingsResponse.error && settingsResponse.data?.rotation_interval_ms) {
      const safeSpeed = Math.max(1200, Number(settingsResponse.data.rotation_interval_ms) || defaultBannerSpeedMs)
      setBannerSpeedMs(safeSpeed)
      setSpeedInputSeconds(String(Math.round(safeSpeed / 1000)))
    }

    if (!introResponse.error && introResponse.data?.intro_text) {
      const intro = String(introResponse.data.intro_text)
      setHeroIntroText(intro)
      setHeroIntroInput(intro)
    }

    const nextServiceImagesMap = {}
    if (!serviceImagesResponse.error && Array.isArray(serviceImagesResponse.data)) {
      for (const row of serviceImagesResponse.data) {
        if (row?.service_key && !nextServiceImagesMap[row.service_key]) {
          nextServiceImagesMap[row.service_key] = row
        }
      }
      setServiceImagesByKey(nextServiceImagesMap)
    }

    let nextAboutImageUrl = ''
    if (!aboutResponse.error && aboutResponse.data) {
      const nextTitle = String(aboutResponse.data.about_title || defaultAboutTitle)
      const nextBody = String(aboutResponse.data.about_body || defaultAboutBody)
      const nextImageUrl = String(aboutResponse.data.image_url || '')
      setAboutTitle(nextTitle)
      setAboutBody(nextBody)
      setAboutTitleInput(nextTitle)
      setAboutBodyInput(nextBody)
      setAboutImageUrl(nextImageUrl)
      nextAboutImageUrl = nextImageUrl
    }

    if (!instagramLinksResponse?.error && Array.isArray(instagramLinksResponse?.data)) {
      const nextLinksMap = {}
      for (const row of instagramLinksResponse.data) {
        if (row?.slot_key) {
          nextLinksMap[row.slot_key] = row?.post_url || ''
        }
      }
      setInstagramLinksByKey(nextLinksMap)
    }

    if (!announcementsResponse?.error && Array.isArray(announcementsResponse?.data)) {
      setHomeAnnouncements(
        announcementsResponse.data
          .filter((item) => item?.is_active)
          .map((item) => ({ id: item.id, message: String(item.message || '') })),
      )
    } else {
      setHomeAnnouncements([])
    }

    setLoadingBannerConfig(false)

    const nextHeroUrls = nextBannerItems.filter((item) => item?.is_active && item?.image_url).map((item) => item.image_url)
    const nextServiceUrls = Object.values(nextServiceImagesMap)
      .map((item) => item?.image_url)
      .filter(Boolean)

    return Array.from(new Set([...nextHeroUrls, ...nextServiceUrls, ...(nextAboutImageUrl ? [nextAboutImageUrl] : [])]))
  }

  useEffect(() => {
    let isMounted = true

    const initializeHomeData = async () => {
      setInitialImagesLoaded(false)

      const initialUrls = await loadBannerConfig()
      if (!isMounted) {
        return
      }

      if (initialUrls.length > 0) {
        await Promise.all(initialUrls.map((url) => preloadImage(url)))
        if (!isMounted) {
          return
        }
      }

      setInitialImagesLoaded(true)
      setHasInitialDataLoaded(true)
    }

    initializeHomeData()

    return () => {
      isMounted = false
    }
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

  const handleSaveHeroIntro = async () => {
    clearBannerFeedback()

    if (!isAdmin) {
      setBannerAdminError('No tienes permisos para editar el texto.')
      return
    }

    if (!supabaseReady || !supabase) {
      setBannerAdminError('Servicio temporalmente no disponible.')
      return
    }

    const nextText = heroIntroInput.trim()
    if (!nextText) {
      setBannerAdminError('El texto no puede estar vacio.')
      return
    }

    setSavingHeroIntro(true)

    const { error } = await supabase
      .schema('app')
      .from('hero_content')
      .upsert({ id: 1, intro_text: nextText }, { onConflict: 'id' })

    if (error) {
      const permissionDenied = error.message?.toLowerCase().includes('permission denied')
      setBannerAdminError(
        permissionDenied ? 'No tienes permisos para editar el texto.' : 'No se pudo guardar el texto.',
      )
      setSavingHeroIntro(false)
      return
    }

    setHeroIntroText(nextText)
    setHeroIntroInput(nextText)
    setShowHeroTextEditor(false)
    setBannerAdminMessage('Hero text updated.')
    setSavingHeroIntro(false)
  }

  const clearServiceFeedback = () => {
    setServiceAdminError('')
    setServiceAdminMessage('')
  }

  const clearAboutFeedback = () => {
    setAboutAdminError('')
    setAboutAdminMessage('')
  }

  const clearInstagramFeedback = () => {
    setInstagramAdminError('')
    setInstagramAdminMessage('')
  }

  const openInstagramLinkEditor = (slotKey) => {
    clearInstagramFeedback()
    setEditingInstagramKey(slotKey)
    setInstagramLinkInput(instagramLinksByKey[slotKey] || '')
    setShowInstagramLinkEditor(true)
  }

  const handleSaveInstagramLink = async () => {
    clearInstagramFeedback()

    if (!isAdmin) {
      setInstagramAdminError('No tienes permisos para editar links de Instagram.')
      return
    }

    if (!supabaseReady || !supabase) {
      setInstagramAdminError('Servicio temporalmente no disponible.')
      return
    }

    if (!editingInstagramKey) {
      setInstagramAdminError('Selecciona una card para actualizar el link.')
      return
    }

    const normalizedUrl = normalizeExternalUrl(instagramLinkInput)
    if (!normalizedUrl) {
      setInstagramAdminError('El link no puede estar vacio.')
      return
    }

    try {
      const parsed = new URL(normalizedUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setInstagramAdminError('El link debe iniciar con http o https.')
        return
      }
    } catch {
      setInstagramAdminError('Ingresa un link valido para la publicacion.')
      return
    }

    setSavingInstagramLink(true)

    const { error } = await supabase
      .schema('app')
      .from('instagram_cards')
      .upsert(
        {
          slot_key: editingInstagramKey,
          post_url: normalizedUrl,
        },
        { onConflict: 'slot_key' },
      )

    if (error) {
      const permissionDenied = error.message?.toLowerCase().includes('permission denied')
      const missingTable = error.message?.toLowerCase().includes('does not exist')
      setInstagramAdminError(
        permissionDenied
          ? 'No tienes permisos para actualizar links de Instagram.'
          : missingTable
            ? 'Falta la tabla app.instagram_cards en Supabase.'
            : 'No se pudo guardar el link de la card.',
      )
      setSavingInstagramLink(false)
      return
    }

    let autoCoverUpdated = false

    try {
      const thumbnailUrl = await resolveInstagramThumbnailUrl(normalizedUrl)
      const proxiedThumbnailUrl = buildInstagramImageProxyUrl(thumbnailUrl)

      if (thumbnailUrl) {
        let finalCoverUrl = proxiedThumbnailUrl || thumbnailUrl

        if (proxiedThumbnailUrl) {
          try {
            const proxyResponse = await fetch(proxiedThumbnailUrl)
            if (proxyResponse.ok) {
              const proxyBlob = await proxyResponse.blob()
              const coverPath = `services/${user?.id || 'admin'}/${editingInstagramKey}/instagram-cover-${Date.now()}.jpg`
              const { error: uploadCoverError } = await supabase.storage.from(serviceBucket).upload(coverPath, proxyBlob, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'image/jpeg',
              })

              if (!uploadCoverError) {
                const { data: publicCoverData } = supabase.storage.from(serviceBucket).getPublicUrl(coverPath)
                if (publicCoverData?.publicUrl) {
                  finalCoverUrl = publicCoverData.publicUrl
                }
              }
            }
          } catch {
            // Keep fallback URL if upload path fails.
          }
        }

        const { error: imageError } = await supabase
          .schema('app')
          .from('service_images')
          .upsert(
            {
              service_key: editingInstagramKey,
              image_url: finalCoverUrl,
            },
            { onConflict: 'service_key' },
          )

        if (!imageError) {
          setServiceImagesByKey((prev) => ({
            ...prev,
            [editingInstagramKey]: {
              ...(prev[editingInstagramKey] || {}),
              service_key: editingInstagramKey,
              image_url: finalCoverUrl,
            },
          }))
          autoCoverUpdated = true
        } else {
          setInstagramAdminError('Se guardo el link, pero no se pudo guardar la caratula automaticamente.')
        }
      }
    } catch {
      // Keep link save successful even if cover extraction fails.
    }

    setInstagramLinksByKey((prev) => ({ ...prev, [editingInstagramKey]: normalizedUrl }))
    setInstagramAdminMessage(
      autoCoverUpdated
        ? 'Instagram card link and cover updated automatically.'
        : 'Instagram card link updated. If cover was not detected, upload image manually.',
    )
    setShowInstagramLinkEditor(false)
    setEditingInstagramKey('')
    setInstagramLinkInput('')
    setSavingInstagramLink(false)
  }

  const handleSaveAboutContent = async () => {
    clearAboutFeedback()

    if (!isAdmin) {
      setAboutAdminError('No tienes permisos para editar About.')
      return
    }

    if (!supabaseReady || !supabase) {
      setAboutAdminError('Servicio temporalmente no disponible.')
      return
    }

    const nextTitle = aboutTitleInput.trim()
    const nextBody = aboutBodyInput.trim()

    if (!nextTitle) {
      setAboutAdminError('El titulo no puede estar vacio.')
      return
    }

    if (!nextBody) {
      setAboutAdminError('La descripcion no puede estar vacia.')
      return
    }

    setSavingAboutContent(true)

    const { error } = await supabase
      .schema('app')
      .from('about_content')
      .upsert({ id: 1, about_title: nextTitle, about_body: nextBody }, { onConflict: 'id' })

    if (error) {
      const permissionDenied = error.message?.toLowerCase().includes('permission denied')
      setAboutAdminError(permissionDenied ? 'No tienes permisos para editar About.' : 'No se pudo guardar About.')
      setSavingAboutContent(false)
      return
    }

    setAboutTitle(nextTitle)
    setAboutBody(nextBody)
    setShowAboutEditor(false)
    setAboutAdminMessage('About updated.')
    setSavingAboutContent(false)
  }

  const closeServiceCropModal = () => {
    if (pendingServicePreviewUrl) {
      URL.revokeObjectURL(pendingServicePreviewUrl)
    }
    setShowServiceCropModal(false)
    setPendingServicePreviewUrl('')
    setPendingServiceFile(null)
    setPendingServiceKey('')
    setServiceCrop({ x: 0, y: 0 })
    setServiceZoom(1)
    setServiceCroppedAreaPixels(null)
  }

  const handleServiceImageUpload = (serviceKey, event) => {
    clearServiceFeedback()

    if (!isAdmin) {
      setServiceAdminError('No tienes permisos para editar imagenes de servicios.')
      return
    }

    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setServiceAdminError('Only image files are allowed.')
      event.target.value = ''
      return
    }

    if (serviceKey.startsWith('apparel-mockup-')) {
      const apparelCount = Object.keys(serviceImagesByKey).filter((k) => k.startsWith('apparel-mockup-')).length
      if (apparelCount >= 2 && !serviceImagesByKey[serviceKey]) {
        setServiceAdminError('Apparel Design only allows 2 images maximum.')
        event.target.value = ''
        return
      }
    }

    if (pendingServicePreviewUrl) {
      URL.revokeObjectURL(pendingServicePreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setPendingServiceFile(file)
    setPendingServicePreviewUrl(previewUrl)
    setPendingServiceKey(serviceKey)
    setServiceCrop({ x: 0, y: 0 })
    setServiceZoom(1)
    setServiceCroppedAreaPixels(null)
    setShowServiceCropModal(true)
    event.target.value = ''
  }

  const handleConfirmServiceCroppedUpload = async () => {
    clearServiceFeedback()
    clearAboutFeedback()

    if (!isAdmin) {
      setServiceAdminError('No tienes permisos para editar imagenes de servicios.')
      return
    }

    if (!supabaseReady || !supabase) {
      setServiceAdminError('Servicio temporalmente no disponible.')
      return
    }

    if (!pendingServiceFile || !pendingServicePreviewUrl || !pendingServiceKey || !serviceCroppedAreaPixels) {
      setServiceAdminError('Select an image and adjust the crop before uploading.')
      return
    }

    setSavingServiceImageKey(pendingServiceKey)

    const outputType = pendingServiceFile.type?.startsWith('image/png') ? 'image/png' : 'image/jpeg'

    let croppedBlob
    try {
      croppedBlob = await getCroppedBlob(pendingServicePreviewUrl, serviceCroppedAreaPixels, outputType)
    } catch {
      setServiceAdminError('No se pudo recortar la imagen del servicio.')
      setSavingServiceImageKey('')
      return
    }

    const extension = outputType === 'image/png' ? 'png' : 'jpg'
    const baseName =
      pendingServiceFile.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || pendingServiceKey
    const cleanFileName = `${baseName}-${Date.now()}.${extension}`
    const objectPath = `services/${user?.id || 'admin'}/${pendingServiceKey}/${cleanFileName}`

    const { error: uploadError } = await supabase.storage.from(serviceBucket).upload(objectPath, croppedBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: outputType,
    })

    if (uploadError) {
      setServiceAdminError('No se pudo subir la imagen del servicio.')
      setSavingServiceImageKey('')
      return
    }

    const { data: publicUrlData } = supabase.storage.from(serviceBucket).getPublicUrl(objectPath)
    const imageUrl = publicUrlData?.publicUrl

    if (!imageUrl) {
      setServiceAdminError('No se pudo generar la URL de la imagen.')
      setSavingServiceImageKey('')
      return
    }

    const isAboutImageUpload = pendingServiceKey === aboutImageServiceKey
    const existing = isAboutImageUpload ? { image_url: aboutImageUrl } : serviceImagesByKey[pendingServiceKey]
    const marker = `/object/public/${serviceBucket}/`
    const idx = existing?.image_url ? existing.image_url.indexOf(marker) : -1
    const oldPath = idx === -1 ? null : existing.image_url.slice(idx + marker.length)

    const { error: dbError } = isAboutImageUpload
      ? await supabase
          .schema('app')
          .from('about_content')
          .upsert(
            {
              id: 1,
              about_title: aboutTitle || defaultAboutTitle,
              about_body: aboutBody || defaultAboutBody,
              image_url: imageUrl,
            },
            { onConflict: 'id' },
          )
      : await supabase
          .schema('app')
          .from('service_images')
          .upsert(
            {
              service_key: pendingServiceKey,
              image_url: imageUrl,
            },
            { onConflict: 'service_key' },
          )

    if (dbError) {
      await supabase.storage.from(serviceBucket).remove([objectPath])
      if (isAboutImageUpload) {
        setAboutAdminError('No se pudo guardar la imagen de About.')
      } else {
        setServiceAdminError('No se pudo guardar la imagen del servicio.')
      }
      setSavingServiceImageKey('')
      return
    }

    if (oldPath && oldPath !== objectPath) {
      const { error: oldDeleteError } = await supabase.storage.from(serviceBucket).remove([oldPath])
      if (oldDeleteError) {
        setServiceAdminError('La imagen nueva se guardo, pero no se pudo borrar la imagen anterior del bucket.')
      }
    }

    const folderPath = `services/${user?.id || 'admin'}/${pendingServiceKey}`
    const { data: folderFiles, error: listError } = await supabase.storage.from(serviceBucket).list(folderPath)
    if (!listError && Array.isArray(folderFiles)) {
      const pathsToDelete = folderFiles
        .filter((file) => file?.name && file.name !== cleanFileName)
        .map((file) => `${folderPath}/${file.name}`)

      if (pathsToDelete.length > 0) {
        const { error: cleanupError } = await supabase.storage.from(serviceBucket).remove(pathsToDelete)
        if (cleanupError) {
          setServiceAdminError('La imagen nueva se guardo, pero no se pudieron limpiar archivos viejos del bucket.')
        }
      }
    }

    await loadBannerConfig()
    if (isAboutImageUpload) {
      setAboutImageUrl(imageUrl)
      setAboutAdminMessage('About image updated.')
    } else {
      setServiceAdminMessage('Service image updated.')
    }
    setSavingServiceImageKey('')
    closeServiceCropModal()
  }

  const handleReviewsPointerDown = (event) => {
    if (!reviewsSliderRef.current) {
      return
    }

    reviewsIsDraggingRef.current = true
    reviewsDragStartXRef.current = event.clientX
    reviewsStartScrollLeftRef.current = reviewsSliderRef.current.scrollLeft
    reviewsSliderRef.current.setPointerCapture?.(event.pointerId)
  }

  const handleReviewsPointerMove = (event) => {
    if (!reviewsIsDraggingRef.current || !reviewsSliderRef.current) {
      return
    }

    const distance = event.clientX - reviewsDragStartXRef.current
    reviewsSliderRef.current.scrollLeft = reviewsStartScrollLeftRef.current - distance
  }

  const handleReviewsPointerEnd = (event) => {
    if (!reviewsIsDraggingRef.current || !reviewsSliderRef.current) {
      return
    }

    reviewsIsDraggingRef.current = false
    reviewsSliderRef.current.releasePointerCapture?.(event.pointerId)
  }

  const clearSubscribeFeedback = () => {
    setSubscribeError('')
    setSubscribeMessage('')
  }

  const handleSubscribeSubmit = async (event) => {
    event.preventDefault()
    clearSubscribeFeedback()

    const email = String(subscribeEmail || '').trim().toLowerCase()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(email)) {
      setSubscribeError('Please enter a valid email address.')
      return
    }

    if (!supabaseReady || !supabase) {
      setSubscribeError('Subscription service is temporarily unavailable. Please try again in a moment.')
      return
    }

    setSubscribing(true)

    const { error } = await supabase.schema('app').from('newsletter_subscribers').insert({
      email,
      source: 'home-subscribe-section',
    })

    if (error) {
      const duplicate = error.code === '23505' || error.message?.toLowerCase().includes('duplicate')

      if (duplicate) {
        setSubscribeMessage("You're already subscribed. We'll keep you on the early-access list.")
      } else {
        setSubscribeError('Could not complete subscription right now. Please try again.')
      }

      setSubscribing(false)
      return
    }

    const nextDefaultEmail = String(user?.email || '').trim().toLowerCase()
    setSubscribeEmail(nextDefaultEmail)
    lastAutoFilledSubscribeEmailRef.current = nextDefaultEmail
    setSubscribeMessage("You're in. We'll send updates on new drops and private releases.")
    setSubscribing(false)
  }

  useEffect(() => {
    const userEmail = String(user?.email || '').trim().toLowerCase()
    const lastAutoFilledEmail = lastAutoFilledSubscribeEmailRef.current

    if (!userEmail) {
      if (subscribeEmail === lastAutoFilledEmail) {
        setSubscribeEmail('')
      }
      lastAutoFilledSubscribeEmailRef.current = ''
      return
    }

    if (!subscribeEmail || subscribeEmail === lastAutoFilledEmail) {
      setSubscribeEmail(userEmail)
      lastAutoFilledSubscribeEmailRef.current = userEmail
    }
  }, [user?.email, subscribeEmail])

  const scrollReviews = (direction) => {
    if (!reviewsSliderRef.current) {
      return
    }

    reviewsScrollPausedRef.current = true
    if (reviewsScrollTimeoutRef.current) {
      clearTimeout(reviewsScrollTimeoutRef.current)
    }
    reviewsScrollTimeoutRef.current = setTimeout(() => {
      reviewsScrollPausedRef.current = false
    }, 1500)

    const firstCard = reviewsSliderRef.current.querySelector('[data-review-card="true"]')
    const cardWidth = firstCard?.getBoundingClientRect().width || 320
    const amount = Math.max(240, Math.round(cardWidth * 0.9))

    reviewsSliderRef.current.scrollBy({
      left: direction === 'next' ? amount : -amount,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const slider = reviewsSliderRef.current
    if (!slider) {
      return undefined
    }

    let frameId = 0
    let lastTimestamp = performance.now()
    const speedPerMs = 0.18

    const animate = (timestamp) => {
      const delta = timestamp - lastTimestamp
      lastTimestamp = timestamp

      if (!reviewsIsDraggingRef.current && !reviewsScrollPausedRef.current) {
        const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth)

        if (maxScroll > 0) {
          slider.scrollLeft += reviewsAutoDirectionRef.current * delta * speedPerMs

          if (slider.scrollLeft >= maxScroll - 2) {
            slider.scrollLeft = maxScroll
            reviewsAutoDirectionRef.current = -1
          } else if (slider.scrollLeft <= 2) {
            slider.scrollLeft = 0
            reviewsAutoDirectionRef.current = 1
          }
        }
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div
      className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-black text-white selection:bg-white selection:text-black"
      data-route-critical-loading={isInitialPageReady ? 'false' : 'true'}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.13),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.11),transparent_32%)]" />

      <SiteHeader
        isHome
        onMobileMenuChange={setIsHeaderMobileMenuOpen}
        announcements={visibleAnnouncements}
      />

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

                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex w-full max-w-sm items-center gap-4">
                    <span className="display-font text-[11px] tracking-widest text-white/60">ZOOM</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                      className="w-full cursor-pointer accent-white"
                    />
                  </div>
                  <button
                    type="button"
                    className="action-btn action-btn-solid w-full shrink-0 justify-center sm:w-auto sm:px-8"
                    onClick={handleConfirmCroppedUpload}
                    disabled={savingBannerConfig || uploadingBannerFile || !croppedAreaPixels}
                  >
                    {uploadingBannerFile ? 'Uploading...' : 'Confirm and Upload'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isAdmin && showServiceCropModal && pendingServicePreviewUrl
            ? createPortal(
                <div
                  className="fixed inset-x-0 bottom-0 top-[73px] z-[125] bg-black/80 p-4 backdrop-blur-sm sm:p-6"
                  onClick={closeServiceCropModal}
                >
                  <div
                    className="mx-auto flex h-full w-full max-w-4xl flex-col rounded-sm border border-white/20 bg-black/90 p-4 sm:p-6"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <p className="display-font text-sm uppercase tracking-[0.2em] text-white">{serviceCropTitle}</p>
                        <p className="mt-1 text-xs text-white/60">
                          Drag and zoom to format. The illuminated area is exactly what will show on the card ({serviceCropFormatLabel} format).
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                        onClick={closeServiceCropModal}
                        title="Close"
                        aria-label="Close service crop modal"
                      >
                        <FiX size={16} />
                      </button>
                    </div>

                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm border border-white/20 bg-black/70">
                      <Cropper
                        image={pendingServicePreviewUrl}
                        crop={serviceCrop}
                        zoom={serviceZoom}
                        aspect={serviceCropAspect}
                        onCropChange={setServiceCrop}
                        onZoomChange={setServiceZoom}
                        onCropComplete={(_croppedArea, pixels) => setServiceCroppedAreaPixels(pixels)}
                        showGrid
                      />
                    </div>

                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex w-full max-w-sm items-center gap-4">
                        <span className="display-font text-[11px] tracking-widest text-white/60">ZOOM</span>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.01}
                          value={serviceZoom}
                          onChange={(event) => setServiceZoom(Number(event.target.value))}
                          className="w-full cursor-pointer accent-white"
                        />
                      </div>
                      <button
                        type="button"
                        className="action-btn action-btn-solid w-full shrink-0 justify-center sm:w-auto sm:px-8"
                        onClick={handleConfirmServiceCroppedUpload}
                        disabled={savingServiceImageKey === pendingServiceKey || !serviceCroppedAreaPixels}
                      >
                        {savingServiceImageKey === pendingServiceKey ? 'Uploading...' : 'Confirm and Upload'}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

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
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/35 bg-black/65 text-white transition hover:border-white/80 hover:bg-black/90"
                        onClick={closeBannerPreview}
                        aria-label="Close image preview"
                        title="Close"
                      >
                        <FiX size={16} />
                      </button>
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

          {isAdmin && showHeroTextEditor
            ? createPortal(
                <div
                  className="fixed inset-x-0 bottom-0 top-[73px] z-[125] bg-black/80 p-4 backdrop-blur-sm sm:p-6"
                  onClick={() => setShowHeroTextEditor(false)}
                >
                  <div
                    className="mx-auto w-full max-w-3xl rounded-sm border border-white/20 bg-black/90 p-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="display-font text-xs tracking-[0.2em] text-white/70">EDIT HERO PARAGRAPH</p>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                        onClick={() => setShowHeroTextEditor(false)}
                        aria-label="Close text editor"
                        title="Close"
                      >
                        <FiX size={16} />
                      </button>
                    </div>

                    <label className="field-wrap">
                      <span>Hero paragraph</span>
                      <textarea
                        rows={7}
                        value={heroIntroInput}
                        onChange={(event) => setHeroIntroInput(event.target.value)}
                        placeholder="Write hero intro text"
                      />
                    </label>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        className="action-btn action-btn-outline"
                        onClick={handleSaveHeroIntro}
                        disabled={savingHeroIntro}
                      >
                        {savingHeroIntro ? 'Saving...' : 'Save Hero Text'}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

          {isAdmin && showInstagramLinkEditor
            ? createPortal(
                <div
                  className="fixed inset-x-0 bottom-0 top-[73px] z-[125] bg-black/80 p-4 backdrop-blur-sm sm:p-6"
                  onClick={() => setShowInstagramLinkEditor(false)}
                >
                  <div
                    className="mx-auto w-full max-w-2xl rounded-sm border border-white/20 bg-black/90 p-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="display-font text-xs tracking-[0.2em] text-white/70">EDIT INSTAGRAM CARD LINK</p>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                        onClick={() => setShowInstagramLinkEditor(false)}
                        aria-label="Close instagram link editor"
                        title="Close"
                      >
                        <FiX size={16} />
                      </button>
                    </div>

                    <label className="field-wrap">
                      <span>Publication URL</span>
                      <input
                        type="text"
                        value={instagramLinkInput}
                        onChange={(event) => setInstagramLinkInput(event.target.value)}
                        placeholder="https://www.instagram.com/p/..."
                      />
                    </label>

                    {instagramAdminError ? <p className="mt-3 text-sm text-red-300">{instagramAdminError}</p> : null}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="action-btn action-btn-outline"
                        onClick={handleSaveInstagramLink}
                        disabled={savingInstagramLink}
                      >
                        {savingInstagramLink ? 'Saving...' : 'Save Link'}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

          {isAdmin && showAboutEditor
            ? createPortal(
                <div
                  className="fixed inset-x-0 bottom-0 top-[73px] z-[125] bg-black/80 p-4 backdrop-blur-sm sm:p-6"
                  onClick={() => setShowAboutEditor(false)}
                >
                  <div
                    className="mx-auto w-full max-w-3xl rounded-sm border border-white/20 bg-black/90 p-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="display-font text-xs tracking-[0.2em] text-white/70">EDIT ABOUT MADEBYVIC</p>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                        onClick={() => setShowAboutEditor(false)}
                        aria-label="Close about editor"
                        title="Close"
                      >
                        <FiX size={16} />
                      </button>
                    </div>

                    <label className="field-wrap">
                      <span>About title</span>
                      <input
                        type="text"
                        value={aboutTitleInput}
                        onChange={(event) => setAboutTitleInput(event.target.value)}
                        placeholder="Write About title"
                      />
                    </label>

                    <label className="field-wrap mt-3">
                      <span>About description</span>
                      <textarea
                        rows={8}
                        value={aboutBodyInput}
                        onChange={(event) => setAboutBodyInput(event.target.value)}
                        placeholder="Write About description"
                      />
                    </label>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        className="action-btn action-btn-outline"
                        onClick={handleSaveAboutContent}
                        disabled={savingAboutContent}
                      >
                        {savingAboutContent ? 'Saving...' : 'Save About'}
                      </button>
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
              <div className="mt-8 max-w-2xl">
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-pretty text-sm leading-relaxed text-white/75 sm:text-base">{heroIntroText}</p>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/30 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                      onClick={() => {
                        setHeroIntroInput(heroIntroText)
                        setShowHeroTextEditor(true)
                      }}
                      aria-label="Edit hero paragraph"
                      title="Edit paragraph"
                    >
                      <FiEdit2 size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
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

          {isAdmin ? (
            <div className="mt-8 rounded-sm border border-white/10 bg-white/[0.02] p-4">
              <p className="display-font text-[11px] tracking-[0.2em] text-white/65">SERVICE IMAGES ADMIN</p>
              {serviceAdminError ? <p className="mt-2 text-sm text-red-300">{serviceAdminError}</p> : null}
              {serviceAdminMessage ? <p className="mt-2 text-sm text-emerald-300">{serviceAdminMessage}</p> : null}
            </div>
          ) : null}

          <div className="mt-12 grid auto-rows-fr gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <article
                key={service.title}
                className="reveal-card group flex h-full flex-col rounded-sm border border-white/15 bg-white/[0.03] p-6 transition duration-500 hover:border-white/40 hover:bg-white/[0.06]"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div>
                  {service.imageUrl ? (
                    <div className="service-image-laser-wrap relative">
                      <svg
                        className="service-image-worm-svg"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <rect className="service-image-worm-track" x="2" y="2" width="96" height="96" rx="2" ry="2" />
                        <rect className="service-image-worm-glow" x="2" y="2" width="96" height="96" rx="2" ry="2" pathLength="100" />
                        <rect className="service-image-worm-core" x="2" y="2" width="96" height="96" rx="2" ry="2" pathLength="100" />
                      </svg>
                      <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-white/20 bg-black/30">
                        <img src={service.imageUrl} alt={`${service.title} image`} className="h-full w-full object-cover object-center" />
                      </div>
                    </div>
                  ) : (
                    <ImagePlaceholder label={`${service.title.toUpperCase()} IMAGE`} ratio="aspect-[16/10]" />
                  )}
                </div>

                <p className="display-font mt-5 text-xs tracking-[0.25em] text-white/50">0{index + 1}</p>
                <h3 className="display-font mt-3 text-2xl uppercase tracking-[0.06em]">{service.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/75 [display:-webkit-box] [-webkit-line-clamp:11] [-webkit-box-orient:vertical] overflow-hidden">
                  {service.description}
                </p>

                {isAdmin ? (
                  <div className="mt-4 flex items-center gap-2">
                    <label className="action-btn action-btn-outline cursor-pointer">
                      {savingServiceImageKey === service.key ? 'Saving...' : 'Change Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => handleServiceImageUpload(service.key, event)}
                        disabled={savingServiceImageKey === service.key}
                      />
                    </label>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="reveal mt-12 flex justify-center">
            <Link
              to="/services"
              className="cta-learn-more group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/30 bg-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-black transition"
            >
              <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.7)_45%,transparent_100%)] transition duration-700 group-hover:translate-x-full" />
              <span className="relative">Learn More</span>
            </Link>
          </div>
        </section>

        <section id="murals" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <SectionIntro tag="MURALS BY VIC" title="Mural Art by Vic">
                Specializing in large-scale wall art designed to transform spaces and leave a lasting impression. From businesses and gyms to restaurants and private homes, each mural is custom-created to reflect the atmosphere, brand, or story behind the space. Every piece is thoughtfully designed and hand-painted to elevate the environment with powerful visual impact and timeless artistry.
              </SectionIntro>

              {isAdmin ? (
                <div className="mt-6 rounded-sm border border-white/10 bg-white/[0.02] p-4">
                  <p className="display-font text-[11px] tracking-[0.2em] text-white/65">MURAL IMAGES ADMIN</p>
                  {serviceAdminError ? <p className="mt-2 text-sm text-red-300">{serviceAdminError}</p> : null}
                  {serviceAdminMessage ? <p className="mt-2 text-sm text-emerald-300">{serviceAdminMessage}</p> : null}
                </div>
              ) : null}

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {muralGallery.map((item) => (
                  <article
                    key={item.key}
                    className="group relative overflow-hidden rounded-sm border border-white/20 bg-black/30"
                  >
                    {item.imageUrl ? (
                      <div className="aspect-[4/5]">
                        <img
                          src={item.imageUrl}
                          alt={`${item.label} image`}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                    ) : (
                      <ImagePlaceholder label={item.label} ratio="aspect-[4/5]" />
                    )}

                    {isAdmin ? (
                      <label className="absolute right-3 top-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/30 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80">
                        <FiEdit2 size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => handleServiceImageUpload(item.key, event)}
                          disabled={savingServiceImageKey === item.key}
                        />
                      </label>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="reveal mt-10 flex justify-center">
                <Link
                  to="/services/mural-art"
                  className="cta-learn-more group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/30 bg-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-black transition"
                >
                  <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.7)_45%,transparent_100%)] transition duration-700 group-hover:translate-x-full" />
                  <span className="relative">Learn More</span>
                </Link>
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

        <section id="digital-design" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <SectionIntro tag="DIGITAL DESIGN" title="Brand Visuals With Attitude">
            Digital design is more than just graphics. It is about building a recognizable identity. I design custom logos, brand visuals, and apparel graphics that help businesses create a strong and professional presence. Whether it is a logo for a new brand or custom t-shirt designs for merchandise, every design is created to make your brand memorable and visually impactful.
          </SectionIntro>

          {isAdmin ? (
            <div className="mt-8 rounded-sm border border-white/10 bg-white/[0.02] p-4">
              <p className="display-font text-[11px] tracking-[0.2em] text-white/65">DIGITAL DESIGN IMAGES ADMIN</p>
              {serviceAdminError ? <p className="mt-2 text-sm text-red-300">{serviceAdminError}</p> : null}
              {serviceAdminMessage ? <p className="mt-2 text-sm text-emerald-300">{serviceAdminMessage}</p> : null}
            </div>
          ) : null}

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="reveal-card flex h-full flex-col rounded-sm border border-white/15 bg-white/[0.03] p-7">
              <h3 className="display-font text-3xl uppercase tracking-[0.07em]">Logo Projects</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                Your logo sets the tone for your whole brand and becomes your signature. I design bold, eye-catching logos that tell your story and match your vibe. From clean and minimal to street-inspired and edgy, every logo is made to stand out and represent your brand with style.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {logoConcepts.map((item) => (
                  <article
                    key={item.key}
                    className="group relative overflow-hidden rounded-sm bg-black/30"
                  >
                    {item.imageUrl ? (
                      <div className={item.ratio}>
                        <img src={item.imageUrl} alt={`${item.label} image`} className="h-full w-full object-cover object-center" />
                      </div>
                    ) : (
                      <ImagePlaceholder label={item.label} ratio={item.ratio} />
                    )}

                    {isAdmin ? (
                      <label className="absolute right-3 top-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/30 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80">
                        <FiEdit2 size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => handleServiceImageUpload(item.key, event)}
                          disabled={savingServiceImageKey === item.key}
                        />
                      </label>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="mt-6 rounded-sm border border-white/15 bg-white/[0.02] p-4">
                <p className="display-font text-[11px] uppercase tracking-[0.22em] text-white/60">Brand Kit Includes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75">Primary Logo</span>
                  <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75">Secondary Mark</span>
                  <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75">Icon Variant</span>
                  <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75">Social Avatar</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/60">
                  Every logo project is designed as a full visual system so your brand looks strong and consistent everywhere.
                </p>
              </div>

              <div className="mt-8 flex justify-center lg:mt-auto lg:pt-6">
                <Link
                  to="/services/logo-design"
                  className="cta-learn-more group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/30 bg-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-black transition"
                >
                  <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.7)_45%,transparent_100%)] transition duration-700 group-hover:translate-x-full" />
                  <span className="relative">Learn More</span>
                </Link>
              </div>
            </article>

            <article className="reveal-card flex h-full flex-col rounded-sm border border-white/15 bg-white/[0.03] p-7 [animation-delay:120ms]">
              <h3 className="display-font text-3xl uppercase tracking-[0.07em]">Apparel Design</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                Custom apparel designs created to turn clothing into wearable art. From t-shirt graphics to full clothing concepts, each design is crafted with creativity, detail, and originality. Whether you are building a brand, launching merchandise, or looking for a unique design, every piece is made to stand out and represent your vision with style.
              </p>
              <div className="mt-6">
                <div className="relative mx-auto max-w-sm">
                  <div className="relative aspect-square overflow-hidden rounded-sm bg-black/30">
                    {apparelMockups[0]?.imageUrl && apparelMockups[1]?.imageUrl ? (
                      <>
                        <img
                          src={apparelMockups[0].imageUrl}
                          alt={apparelMockups[0].label}
                          className="absolute inset-0 h-full w-full object-cover object-center"
                          style={{ opacity: 1 - apparelBlendRatio }}
                        />
                        <img
                          src={apparelMockups[1].imageUrl}
                          alt={apparelMockups[1].label}
                          className="absolute inset-0 h-full w-full object-cover object-center"
                          style={{
                            opacity: apparelBlendRatio,
                            transform: `scale(${1.22 - apparelBlendRatio * 0.22})`,
                            transformOrigin: 'center',
                          }}
                        />
                      </>
                    ) : apparelMockups[0]?.imageUrl ? (
                      <img src={apparelMockups[0].imageUrl} alt={apparelMockups[0].label} className="h-full w-full object-cover object-center" />
                    ) : apparelMockups[1]?.imageUrl ? (
                      <img src={apparelMockups[1].imageUrl} alt={apparelMockups[1].label} className="h-full w-full object-cover object-center" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-sm text-white/60">Transform your design in a t-shirt</p>
                      </div>
                    )}
                    {isAdmin && apparelMockups[activeApparelIndex] ? (
                      <label className="absolute right-3 top-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/30 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80">
                        <FiEdit2 size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => handleServiceImageUpload(apparelMockups[activeApparelIndex].key, event)}
                          disabled={savingServiceImageKey === apparelMockups[activeApparelIndex].key}
                        />
                      </label>
                    ) : null}
                  </div>
                  
                  {apparelMockups[0]?.imageUrl || apparelMockups[1]?.imageUrl ? (
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
                        <span>Design</span>
                        <span>T-Shirt</span>
                      </div>
                      <div className="apparel-slider-container" style={{ '--apparel-slider-progress': `${apparelBlendValue}%` }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={apparelBlendValue}
                          onChange={(event) => setApparelBlendValue(Number(event.target.value))}
                          className="apparel-slider w-full"
                          aria-label="Transform design to t-shirt"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 flex justify-center lg:mt-auto lg:pt-6">
                <Link
                  to="/services/apparel-design"
                  className="cta-learn-more group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/30 bg-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-black transition"
                >
                  <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.7)_45%,transparent_100%)] transition duration-700 group-hover:translate-x-full" />
                  <span className="relative">Learn More</span>
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section id="contact" className="mx-auto w-full max-w-7xl px-5 pb-24 pt-20 sm:px-7 lg:px-10">
          <div className="relative mb-12 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <h2 className="display-font text-center text-xs tracking-[0.32em] text-white/50">ABOUT MADEBYVIC</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <div className="relative grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20 items-center">
            <div className="reveal order-2 lg:order-1 relative">
              <div className="overflow-hidden bg-black/30 aspect-[3/4]">
                {aboutImageUrl ? (
                  <img src={aboutImageUrl} alt="About Madebyvic" className="h-full w-full object-cover object-center grayscale-[50%] transition-all duration-700 hover:grayscale-0" />
                ) : (
                  <ImagePlaceholder label="ABOUT IMAGE" ratio="aspect-[3/4]" />
                )}
              </div>

              {isAdmin ? (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                  <label className="action-btn action-btn-outline cursor-pointer bg-black/80 backdrop-blur-sm">
                    {savingServiceImageKey === aboutImageServiceKey ? 'Saving...' : 'Change Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => handleServiceImageUpload(aboutImageServiceKey, event)}
                      disabled={savingServiceImageKey === aboutImageServiceKey}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="reveal-delay order-1 lg:order-2">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <h2 className="display-font text-balance text-4xl uppercase tracking-[0.05em] sm:text-5xl lg:text-5xl">{aboutTitle}</h2>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-white/30 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                    onClick={() => {
                      clearAboutFeedback()
                      setAboutTitleInput(aboutTitle)
                      setAboutBodyInput(aboutBody)
                      setShowAboutEditor(true)
                    }}
                    aria-label="Edit about content"
                    title="Edit about"
                  >
                    <FiEdit2 size={15} />
                  </button>
                ) : null}
              </div>

              <div className="space-y-6">
                {aboutBody.split(/\n\n+/).map((paragraph, index) => (
                  <p key={`${paragraph.slice(0, 18)}-${index}`} className="text-sm leading-relaxed text-white/80 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>

              {aboutAdminError ? <p className="mt-4 text-sm text-red-300">{aboutAdminError}</p> : null}
              {aboutAdminMessage ? <p className="mt-4 text-sm text-emerald-300">{aboutAdminMessage}</p> : null}
            </div>
          </div>
        </section>

        <section id="instagram" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <div className="text-center">
            <h2 className="display-font text-4xl uppercase tracking-[0.04em] text-white sm:text-5xl lg:text-6xl">Follow me on Instagram</h2>
            <p className="mt-4 text-sm text-white/65 sm:text-base">
              Real projects, murals and studio moments. Tap any card to open the publication.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {instagramCards.map((card, index) => {
              const hasImage = Boolean(card.imageUrl)
              const hasLink = Boolean(card.postUrl)

              return (
                <article
                  key={card.key}
                  className="reveal-card group relative overflow-hidden rounded-sm border border-white/15 bg-white/[0.03]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {hasImage ? (
                    hasLink ? (
                      <a href={card.postUrl} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3]">
                        <img src={card.imageUrl} alt={`${card.label} Instagram post`} className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]" />
                      </a>
                    ) : (
                      <div className="aspect-[4/3]">
                        <img src={card.imageUrl} alt={`${card.label} Instagram post`} className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]" />
                      </div>
                    )
                  ) : (
                    <ImagePlaceholder label={card.label} ratio="aspect-[4/3]" />
                  )}

                  {isAdmin ? (
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-sm border border-white/30 bg-black/60 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/70 hover:bg-black/80">
                        IMG
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => handleServiceImageUpload(card.key, event)}
                          disabled={savingServiceImageKey === card.key}
                        />
                      </label>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/30 bg-black/60 text-white transition hover:border-white/70 hover:bg-black/80"
                        onClick={() => openInstagramLinkEditor(card.key)}
                        title="Edit post link"
                        aria-label={`Edit link for ${card.label}`}
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          {isAdmin ? (
            <div className="mt-6 rounded-sm border border-white/10 bg-white/[0.02] p-4">
              <p className="display-font text-[11px] tracking-[0.2em] text-white/70">INSTAGRAM CARDS ADMIN</p>
              <p className="mt-2 text-xs text-white/55">Use IMG to replace the photo and the pencil to edit the publication URL for that card.</p>
              {instagramAdminError ? <p className="mt-2 text-sm text-red-300">{instagramAdminError}</p> : null}
              {instagramAdminMessage ? <p className="mt-2 text-sm text-emerald-300">{instagramAdminMessage}</p> : null}
            </div>
          ) : null}

          <div className="mt-10 flex justify-center">
            <a
              href={instagramProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-learn-more group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/30 bg-white px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-black transition"
            >
              <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.7)_45%,transparent_100%)] transition duration-700 group-hover:translate-x-full" />
              <span className="relative">My Instagram</span>
            </a>
          </div>
        </section>

        <section id="reviews" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-7 lg:px-10">
          <div className="relative overflow-hidden rounded-sm border border-white/15 bg-white/[0.03] p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="reveal">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="display-font text-xs tracking-[0.34em] text-white/60">CLIENT REVIEWS</p>
                    <h2 className="display-font mt-3 text-balance text-3xl uppercase tracking-[0.06em] text-white sm:text-4xl lg:text-5xl">
                      Real Feedback. Real Impact.
                    </h2>
                    <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/75 sm:text-base">
                      Every project is built through collaboration from first sketch to final delivery. These reviews reflect the real experience of working with Madebyvic.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative mt-8 sm:mt-10">
                <button
                  type="button"
                  className="absolute left-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-black text-white shadow-[0_0_0_2px_rgba(255,255,255,0.85)] transition hover:scale-[1.03] lg:inline-flex"
                  onClick={() => scrollReviews('prev')}
                  aria-label="Scroll reviews left"
                >
                  <FiChevronLeft size={19} />
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black text-white transition hover:border-white/80 hover:scale-[1.03] lg:inline-flex"
                  onClick={() => scrollReviews('next')}
                  aria-label="Scroll reviews right"
                >
                  <FiChevronRight size={19} />
                </button>

                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-black/55 to-transparent lg:block" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-black/55 to-transparent lg:block" />

                <div
                  ref={reviewsSliderRef}
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 cursor-grab select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden active:cursor-grabbing"
                  aria-label="Client reviews slider"
                  onPointerDown={handleReviewsPointerDown}
                  onPointerMove={handleReviewsPointerMove}
                  onPointerUp={handleReviewsPointerEnd}
                  onPointerCancel={handleReviewsPointerEnd}
                  onPointerLeave={handleReviewsPointerEnd}
                >
                  {clientReviews.map((review, index) => (
                  <article
                    key={review.id}
                    data-review-card="true"
                    className="reveal-card min-w-[88%] snap-start rounded-sm border border-white/15 bg-black/40 p-5 backdrop-blur-sm sm:min-w-[56%] lg:min-w-[38%] xl:min-w-[31%]"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="display-font text-sm uppercase tracking-[0.14em] text-white">{review.name}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/55">{review.context}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] tracking-[0.25em] text-white">★★★★★</p>
                        <p className="display-font mt-1 text-xs tracking-[0.2em] text-white/80">{review.rating}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-white/80">"{review.text}"</p>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">{review.service}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{review.date}</p>
                    </div>
                  </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="subscribe" className="mx-auto w-full max-w-7xl px-5 pb-24 sm:px-7 lg:px-10">
          <div className="relative overflow-hidden rounded-sm border border-white/15 bg-[linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] p-6 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -left-14 -top-14 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 right-4 h-56 w-56 rounded-full bg-white/[0.08] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="reveal">
                <p className="display-font text-xs tracking-[0.34em] text-white/60">PRIVATE LIST</p>
                <h2 className="display-font mt-3 max-w-3xl text-balance text-3xl uppercase tracking-[0.06em] text-white sm:text-4xl lg:text-5xl">
                  Get First Access To New Art Drops
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                  Join the private list and receive early release alerts, new collection previews, and limited announcements before public launch.
                </p>
              </div>

              <form className="reveal-delay rounded-sm border border-white/15 bg-black/40 p-5 sm:p-6" onSubmit={handleSubscribeSubmit}>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-white/60">Email Address</label>
                <input
                  type="email"
                  value={subscribeEmail}
                  onChange={(event) => {
                    setSubscribeEmail(event.target.value)
                    if (subscribeError || subscribeMessage) {
                      clearSubscribeFeedback()
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-3 h-12 w-full rounded-sm border border-white/25 bg-black/45 px-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/70"
                  required
                />

                <button
                  type="submit"
                  className="action-btn action-btn-solid mt-4 w-full justify-center"
                  disabled={subscribing}
                >
                  {subscribing ? 'Subscribing...' : 'Subscribe'}
                </button>

                {subscribeError ? <p className="mt-3 text-sm text-red-300">{subscribeError}</p> : null}
                {subscribeMessage ? <p className="mt-3 text-sm text-emerald-300">{subscribeMessage}</p> : null}
              </form>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default App
