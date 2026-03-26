import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowUpRight, FiEdit2, FiX } from 'react-icons/fi'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../context/AuthContext'
import { supabase, supabaseReady } from '../lib/supabase'

const servicePageBucket = (import.meta.env.VITE_SUPABASE_SERVICE_BUCKET || 'service-images').trim()
const defaultSlotSpeedMs = 5200
const maxServicesUploadBytes = Number(import.meta.env.VITE_SERVICE_PAGE_MAX_UPLOAD_BYTES || 1024 * 1024)

const editableImageSlots = [
  {
    key: 'services-hero',
    label: 'Services hero banner',
    aspect: 16 / 6,
    defaultUrl: '',
  },
  {
    key: 'services-card-commissioned',
    label: 'Commission card',
    aspect: 4 / 3,
    defaultUrl: '',
  },
  {
    key: 'services-card-mural',
    label: 'Mural card',
    aspect: 4 / 3,
    defaultUrl: '',
  },
  {
    key: 'services-card-canvas',
    label: 'Canvas card',
    aspect: 4 / 3,
    defaultUrl: '',
  },
  {
    key: 'services-card-logo-design',
    label: 'Digital design card',
    aspect: 4 / 3,
    defaultUrl: '',
  },
  {
    key: 'services-card-apparel-design',
    label: 'Apparel design card',
    aspect: 4 / 3,
    defaultUrl: '',
  },
]

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })

const servicesCache = {
  imagesBySlot: {},
  settingsBySlot: {},
  speedInputsBySlot: {},
  routeDataLoaded: false,
  routeImagesReady: false,
}

const getCroppedBlob = async (imageSrc, cropPixels, outputType = 'image/jpeg') => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')

  // Keep the crop output under a safe render size to avoid canvas allocation failures.
  const maxOutputSide = 2600
  const outputWidth = Math.max(1, Math.round(cropPixels.width))
  const outputHeight = Math.max(1, Math.round(cropPixels.height))
  const scale = Math.min(1, maxOutputSide / Math.max(outputWidth, outputHeight))
  canvas.width = Math.max(1, Math.floor(outputWidth * scale))
  canvas.height = Math.max(1, Math.floor(outputHeight * scale))

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
    canvas.width,
    canvas.height,
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

const canvasToBlob = (canvas, outputType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to render image blob.'))
          return
        }
        resolve(blob)
      },
      outputType,
      quality,
    )
  })

const optimizeBlobForUpload = async (inputBlob, maxBytes) => {
  if (inputBlob.size <= maxBytes) {
    return inputBlob
  }

  let workingBlob = inputBlob
  let quality = 0.82
  let scale = 1

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const objectUrl = URL.createObjectURL(workingBlob)
    const image = await createImage(objectUrl)
    URL.revokeObjectURL(objectUrl)

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(image.width * scale))
    canvas.height = Math.max(1, Math.floor(image.height * scale))

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not prepare canvas context for compression.')
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    workingBlob = await canvasToBlob(canvas, 'image/jpeg', quality)

    if (workingBlob.size <= maxBytes) {
      return workingBlob
    }

    if (quality > 0.5) {
      quality -= 0.08
    } else {
      scale *= 0.85
      quality = 0.78
    }
  }

  return workingBlob
}

function ServicesPage() {
  const { user, canEditAsAdmin } = useAuth()
  const isAdmin = canEditAsAdmin === true

  const [imagesBySlot, setImagesBySlot] = useState(servicesCache.imagesBySlot)
  const [settingsBySlot, setSettingsBySlot] = useState(servicesCache.settingsBySlot)
  const [speedInputsBySlot, setSpeedInputsBySlot] = useState(servicesCache.speedInputsBySlot)
  const [activeIndexBySlot, setActiveIndexBySlot] = useState({})
  const [servicesPageAdminError, setServicesPageAdminError] = useState('')
  const [servicesPageAdminMessage, setServicesPageAdminMessage] = useState('')
  const [savingSlotKey, setSavingSlotKey] = useState('')
  const [showSlotEditorModal, setShowSlotEditorModal] = useState(false)
  const [editingSlotKey, setEditingSlotKey] = useState('')
  const [headerSolidThreshold, setHeaderSolidThreshold] = useState(360)
  const heroSectionRef = useRef(null)

  const [showCropModal, setShowCropModal] = useState(false)
  const [pendingSlotKey, setPendingSlotKey] = useState('')
  const [pendingSlotAspect, setPendingSlotAspect] = useState(16 / 9)
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [routeDataLoaded, setRouteDataLoaded] = useState(servicesCache.routeDataLoaded)
  const [routeImagesReady, setRouteImagesReady] = useState(servicesCache.routeImagesReady)

  const slotByKey = useMemo(
    () =>
      editableImageSlots.reduce((acc, slot) => {
        acc[slot.key] = slot
        return acc
      }, {}),
    [],
  )

  const clearFeedback = () => {
    setServicesPageAdminError('')
    setServicesPageAdminMessage('')
  }

  const withErrorDetails = (baseMessage, error) => {
    if (!error) {
      return baseMessage
    }
    const details = [error.message, error.statusCode, error.error].filter(Boolean).join(' | ')
    return details ? `${baseMessage} Details: ${details}` : baseMessage
  }

  const resolveSlotItems = (slotKey) => {
    const items = imagesBySlot[slotKey] || []
    if (items.length > 0) {
      return items
    }

    const fallback = slotByKey[slotKey]?.defaultUrl || ''
    return fallback ? [{ id: `default-${slotKey}`, image_url: fallback, slot_key: slotKey }] : []
  }

  const resolveSlotImage = (slotKey) => {
    const items = resolveSlotItems(slotKey)
    if (items.length === 0) {
      return ''
    }
    const activeIndex = activeIndexBySlot[slotKey] || 0
    const clampedIndex = Math.min(activeIndex, items.length - 1)
    return items[clampedIndex]?.image_url || items[0].image_url
  }

  const preloadImage = (url) =>
    new Promise((resolve) => {
      const image = new Image()
      const done = () => {
        image.onload = null
        image.onerror = null
        resolve()
      }

      image.onload = done
      image.onerror = done
      image.src = url
    })

  const routeCriticalImageUrls = useMemo(() => {
    const urls = []

    for (const slot of editableImageSlots) {
      for (const row of imagesBySlot[slot.key] || []) {
        if (row?.image_url) {
          urls.push(row.image_url)
        }
      }
    }

    return Array.from(new Set(urls))
  }, [imagesBySlot])

  const isRouteCriticalReady = routeDataLoaded && routeImagesReady

  const loadServicesPageImages = async ({ silent = false } = {}) => {
    if (!silent) {
      setRouteDataLoaded(false)
      setRouteImagesReady(false)
      servicesCache.routeDataLoaded = false
      servicesCache.routeImagesReady = false
    }

    if (!supabaseReady || !supabase) {
      servicesCache.routeDataLoaded = true
      setRouteDataLoaded(true)
      return
    }

    const { data, error } = await supabase
      .schema('app')
      .from('services_page_images')
      .select('id, slot_key, image_url, sort_order, is_active, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    const { data: settingsData, error: settingsError } = await supabase
      .schema('app')
      .from('services_page_settings')
      .select('slot_key, speed_ms')

    if (error) {
      servicesCache.routeDataLoaded = true
      setRouteDataLoaded(true)
      return
    }

    const nextMap = {}
    for (const row of data || []) {
      if (row.slot_key) {
        if (!nextMap[row.slot_key]) {
          nextMap[row.slot_key] = []
        }
        nextMap[row.slot_key].push(row)
      }
    }
    servicesCache.imagesBySlot = nextMap
    setImagesBySlot(nextMap)

    if (!settingsError) {
      const nextSettings = {}
      const nextInputs = {}

      for (const slot of editableImageSlots) {
        const found = (settingsData || []).find((row) => row.slot_key === slot.key)
        const speedMs = Math.max(1200, Number(found?.speed_ms || defaultSlotSpeedMs))
        nextSettings[slot.key] = { slot_key: slot.key, speed_ms: speedMs }
        nextInputs[slot.key] = String(Math.round(speedMs / 1000))
      }

      servicesCache.settingsBySlot = nextSettings
      servicesCache.speedInputsBySlot = nextInputs
      setSettingsBySlot(nextSettings)
      setSpeedInputsBySlot(nextInputs)
    }

    servicesCache.routeDataLoaded = true
    setRouteDataLoaded(true)
  }

  useEffect(() => {
    if (!servicesCache.routeDataLoaded) {
      loadServicesPageImages()
      return
    }

    // Keep cached UI instantly visible on return to this route.
    setRouteDataLoaded(true)
    setRouteImagesReady(servicesCache.routeImagesReady)
    setImagesBySlot(servicesCache.imagesBySlot)
    setSettingsBySlot(servicesCache.settingsBySlot)
    setSpeedInputsBySlot(servicesCache.speedInputsBySlot)

    // Refresh from DB in background without flashing the route loader.
    loadServicesPageImages({ silent: true })
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!routeDataLoaded) {
        if (!cancelled) {
          setRouteImagesReady(false)
        }
        return
      }

      if (servicesCache.routeImagesReady) {
        if (!cancelled) {
          setRouteImagesReady(true)
        }
        return
      }

      if (routeCriticalImageUrls.length === 0) {
        if (!cancelled) {
          servicesCache.routeImagesReady = true
          setRouteImagesReady(true)
        }
        return
      }

      if (!cancelled) {
        setRouteImagesReady(false)
      }

      await Promise.all(routeCriticalImageUrls.map((url) => preloadImage(url)))

      if (!cancelled) {
        servicesCache.routeImagesReady = true
        setRouteImagesReady(true)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [routeDataLoaded, routeCriticalImageUrls])

  useEffect(() => {
    const updateThreshold = () => {
      const sectionHeight = heroSectionRef.current?.offsetHeight || 420
      setHeaderSolidThreshold(Math.max(180, sectionHeight - 80))
    }

    updateThreshold()
    window.addEventListener('resize', updateThreshold)

    return () => {
      window.removeEventListener('resize', updateThreshold)
    }
  }, [])

  useEffect(() => {
    const intervals = []

    for (const slot of editableImageSlots) {
      const items = resolveSlotItems(slot.key)
      if (items.length <= 1) {
        setActiveIndexBySlot((prev) => ({ ...prev, [slot.key]: 0 }))
        continue
      }

      const speedMs = Math.max(1200, Number(settingsBySlot[slot.key]?.speed_ms || defaultSlotSpeedMs))
      const intervalId = window.setInterval(() => {
        setActiveIndexBySlot((prev) => {
          const current = prev[slot.key] || 0
          return {
            ...prev,
            [slot.key]: (current + 1) % items.length,
          }
        })
      }, speedMs)

      intervals.push(intervalId)
    }

    return () => {
      for (const id of intervals) {
        window.clearInterval(id)
      }
    }
  }, [imagesBySlot, settingsBySlot])

  const shouldLockPageScroll = showCropModal || showSlotEditorModal

  useEffect(() => {
    if (!shouldLockPageScroll) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [shouldLockPageScroll])

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl)
      }
    }
  }, [pendingPreviewUrl])

  const closeCropModal = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl)
    }
    setShowCropModal(false)
    setPendingSlotKey('')
    setPendingSlotAspect(16 / 9)
    setPendingFile(null)
    setPendingPreviewUrl('')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const openSlotEditor = (slotKey) => {
    clearFeedback()
    setEditingSlotKey(slotKey)
    setShowSlotEditorModal(true)
  }

  const closeSlotEditor = () => {
    setShowSlotEditorModal(false)
    setEditingSlotKey('')
  }

  const handleFileSelection = (slotKey, event) => {
    clearFeedback()

    if (!isAdmin) {
      setServicesPageAdminError('You do not have permission to edit images.')
      return
    }

    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setServicesPageAdminError('Only image files are allowed.')
      event.target.value = ''
      return
    }

    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingPreviewUrl(previewUrl)
    setPendingSlotKey(slotKey)
    setPendingSlotAspect(slotByKey[slotKey]?.aspect || 16 / 9)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setShowCropModal(true)
    event.target.value = ''
  }

  const handleConfirmUpload = async () => {
    clearFeedback()

    if (!isAdmin) {
      setServicesPageAdminError('You do not have permission to edit images.')
      return
    }

    if (!supabaseReady || !supabase) {
      setServicesPageAdminError('Service is temporarily unavailable.')
      return
    }

    if (!pendingFile || !pendingPreviewUrl || !pendingSlotKey || !croppedAreaPixels) {
      setServicesPageAdminError('Select an image and adjust the crop before uploading.')
      return
    }

    setSavingSlotKey(pendingSlotKey)

    const outputType = 'image/jpeg'
    let croppedBlob

    try {
      croppedBlob = await getCroppedBlob(pendingPreviewUrl, croppedAreaPixels, outputType)
    } catch {
      setServicesPageAdminError('Could not crop the image. The file format may be unsupported.')
      setSavingSlotKey('')
      return
    }

    try {
      croppedBlob = await optimizeBlobForUpload(croppedBlob, maxServicesUploadBytes)
    } catch {
      setServicesPageAdminError('Could not optimize the image for upload. Please try another file.')
      setSavingSlotKey('')
      return
    }

    if (croppedBlob.size > maxServicesUploadBytes) {
      setServicesPageAdminError(
        `Image is still too large after optimization (${Math.ceil(croppedBlob.size / 1024)}KB). Please use a smaller file.`,
      )
      setSavingSlotKey('')
      return
    }

    const extension = outputType === 'image/png' ? 'png' : 'jpg'
    const baseName =
      pendingFile.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || pendingSlotKey
    const cleanFileName = `${baseName}-${Date.now()}.${extension}`
    const folderPath = `services-page/${user?.id || 'admin'}/${pendingSlotKey}`
    const objectPath = `${folderPath}/${cleanFileName}`

    const { error: uploadError } = await supabase.storage.from(servicePageBucket).upload(objectPath, croppedBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: outputType,
    })

    if (uploadError) {
      setServicesPageAdminError(withErrorDetails('Could not upload the image.', uploadError))
      setSavingSlotKey('')
      return
    }

    const { data: publicUrlData } = supabase.storage.from(servicePageBucket).getPublicUrl(objectPath)
    const imageUrl = publicUrlData?.publicUrl

    if (!imageUrl) {
      setServicesPageAdminError('Could not generate the image URL.')
      setSavingSlotKey('')
      return
    }

    const { error: dbError } = await supabase
      .schema('app')
      .from('services_page_images')
      .insert({
        slot_key: pendingSlotKey,
        image_url: imageUrl,
        sort_order: (imagesBySlot[pendingSlotKey] || []).length + 1,
        is_active: true,
      })

    if (dbError) {
      await supabase.storage.from(servicePageBucket).remove([objectPath])
      setServicesPageAdminError(withErrorDetails('Could not save the image record.', dbError))
      setSavingSlotKey('')
      return
    }

    await loadServicesPageImages()
    setServicesPageAdminMessage('Image updated.')
    setSavingSlotKey('')
    closeCropModal()
  }

  const handleRemoveImage = async (slotKey, imageRow) => {
    clearFeedback()

    if (!isAdmin) {
      setServicesPageAdminError('You do not have permission to edit images.')
      return
    }

    if (!supabaseReady || !supabase) {
      setServicesPageAdminError('Service is temporarily unavailable.')
      return
    }

    setSavingSlotKey(slotKey)

    const marker = `/object/public/${servicePageBucket}/`
    const idx = imageRow.image_url?.indexOf(marker) ?? -1
    const objectPath = idx === -1 ? null : imageRow.image_url.slice(idx + marker.length)

    const { error: dbError } = await supabase.schema('app').from('services_page_images').delete().eq('id', imageRow.id)
    if (dbError) {
      setServicesPageAdminError(withErrorDetails('Could not remove the image.', dbError))
      setSavingSlotKey('')
      return
    }

    if (objectPath) {
      await supabase.storage.from(servicePageBucket).remove([objectPath])
    }

    await loadServicesPageImages()
    setServicesPageAdminMessage('Image removed.')
    setSavingSlotKey('')
  }

  const handleSaveSlotSpeed = async (slotKey) => {
    clearFeedback()

    if (!isAdmin) {
      setServicesPageAdminError('You do not have permission to edit speed settings.')
      return
    }

    if (!supabaseReady || !supabase) {
      setServicesPageAdminError('Service is temporarily unavailable.')
      return
    }

    const rawSeconds = speedInputsBySlot[slotKey]
    const parsedSeconds = Number(rawSeconds)
    if (!Number.isFinite(parsedSeconds) || parsedSeconds < 1.2 || parsedSeconds > 30) {
      setServicesPageAdminError('Speed must be between 1.2 and 30 seconds.')
      return
    }

    const speedMs = Math.round(parsedSeconds * 1000)
    setSavingSlotKey(slotKey)

    const { error } = await supabase
      .schema('app')
      .from('services_page_settings')
      .upsert({ slot_key: slotKey, speed_ms: speedMs }, { onConflict: 'slot_key' })

    if (error) {
      setServicesPageAdminError(withErrorDetails('Could not save speed settings.', error))
      setSavingSlotKey('')
      return
    }

    setSettingsBySlot((prev) => ({
      ...prev,
      [slotKey]: { slot_key: slotKey, speed_ms: speedMs },
    }))
    setServicesPageAdminMessage('Speed updated.')
    setSavingSlotKey('')
  }

  const renderSlotEditor = (slotKey, label) => {
    const images = imagesBySlot[slotKey] || []
    const isSaving = savingSlotKey === slotKey

    return (
      <div className="rounded-sm border border-white/20 bg-black/90 p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="display-font text-[11px] tracking-[0.2em] text-white/70">{label.toUpperCase()}</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/35 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:border-white hover:bg-white/90">
            {isSaving ? 'Saving...' : '+ Change'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleFileSelection(slotKey, event)}
              disabled={isSaving}
            />
          </label>
        </div>

        {servicesPageAdminError ? <p className="mt-3 text-sm text-red-300">{servicesPageAdminError}</p> : null}
        {servicesPageAdminMessage ? <p className="mt-3 text-sm text-emerald-300">{servicesPageAdminMessage}</p> : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="field-wrap !text-white/70">
            <span>Speed (seconds)</span>
            <input
              type="number"
              min="1.2"
              max="30"
              step="0.1"
              className="!border-white/25 !bg-black/50 !text-white focus:!border-white/45 focus:!bg-black/50 focus:!text-white"
              value={speedInputsBySlot[slotKey] || String(Math.round(defaultSlotSpeedMs / 1000))}
              onChange={(event) =>
                setSpeedInputsBySlot((prev) => ({
                  ...prev,
                  [slotKey]: event.target.value,
                }))
              }
            />
          </label>
          <button
            type="button"
            className="action-btn action-btn-outline justify-center"
            onClick={() => handleSaveSlotSpeed(slotKey)}
            disabled={isSaving}
          >
            Save Speed
          </button>
        </div>

        {images.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {images.map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-sm border border-white/15 bg-black/50">
                <img src={img.image_url} alt={label} className="h-16 w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-sm border border-white/70 bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                  onClick={() => handleRemoveImage(slotKey, img)}
                  disabled={isSaving}
                  aria-label="Remove image"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-white/60">Using default image.</p>
        )}
      </div>
    )
  }

  const heroItems = resolveSlotItems('services-hero')
  const heroActiveIndex = Math.min(activeIndexBySlot['services-hero'] || 0, Math.max(0, heroItems.length - 1))

  const primaryCards = [
    {
      title: 'Commission art',
      slotKey: 'services-card-commissioned',
      label: 'Commission art carousel',
      slug: 'commissioned-art',
      items: resolveSlotItems('services-card-commissioned'),
    },
    {
      title: 'Mural Art',
      slotKey: 'services-card-mural',
      label: 'Mural art carousel',
      slug: 'mural-art',
      items: resolveSlotItems('services-card-mural'),
    },
    {
      title: 'Canvas Art',
      slotKey: 'services-card-canvas',
      label: 'Canvas art carousel',
      slug: 'canvas-art',
      items: resolveSlotItems('services-card-canvas'),
    },
  ]

  const digitalDesignCards = [
    {
      title: 'Logo Design',
      slotKey: 'services-card-logo-design',
      label: 'Logo design carousel',
      slug: 'logo-design',
      items: resolveSlotItems('services-card-logo-design'),
    },
    {
      title: 'Apparel Design',
      slotKey: 'services-card-apparel-design',
      label: 'Apparel design carousel',
      slug: 'apparel-design',
      items: resolveSlotItems('services-card-apparel-design'),
    },
  ]

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#ece9e4] text-[#121212] selection:bg-black selection:text-white"
      data-route-critical-loading={isRouteCriticalReady ? 'false' : 'true'}
    >
      <SiteHeader transparent solidAfterScroll solidScrollThreshold={headerSolidThreshold} />

      <main className="pb-16">
          <section ref={heroSectionRef} className="relative h-[42vh] min-h-[300px] w-full overflow-hidden border-b border-black/10 sm:h-[52vh]">
            {/* Hero image absolutely positioned under the header for true overlay */}
            <div className="absolute inset-0 z-0">
              {heroItems.map((item, index) => (
                <img
                  key={item.id || item.image_url}
                  src={item.image_url}
                  alt="Services hero"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1300ms] ease-in-out ${
                    index === heroActiveIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25),rgba(0,0,0,0.45))]" />
            </div>
            <div className="relative z-10 h-full w-full">
              <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-8 sm:px-7 lg:px-10">
                <p className="display-font text-sm tracking-[0.34em] text-white/90">SERVICES</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  className="absolute right-4 top-24 z-[70] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/65 text-white transition hover:border-white hover:bg-black/85 sm:top-28"
                  onClick={() => openSlotEditor('services-hero')}
                  aria-label="Edit services hero carousel"
                >
                  <FiEdit2 size={15} />
                </button>
              ) : null}
            </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pt-12 sm:px-7 sm:pt-14 lg:px-10">
          <h1 className="display-font text-5xl uppercase tracking-[0.02em] text-black sm:text-6xl">MY SERVICES</h1>

          <div className="mt-8 grid gap-10 border-b border-black/25 pb-10 lg:grid-cols-2 lg:gap-16">
            <p className="font-serif text-lg leading-relaxed text-black/90 sm:text-2xl">
              When you work with me, you&apos;re not just receiving artwork-you&apos;re getting a unique artistic
              experience. Every piece is created with intention, detail, and purpose. Whether it&apos;s a custom mural
              for your business or an original artwork for your home, I focus on capturing your vision and
              transforming it into something visually powerful, meaningful, and truly one of a kind.
            </p>
            <p className="font-serif text-lg leading-relaxed text-black/90 sm:text-2xl">
              These services exist because every space and every person deserves art that matches their identity.
            </p>
          </div>

          <div className="mt-10 grid gap-10 md:grid-cols-2 xl:grid-cols-4">
            <article className="space-y-4">
              <h2 className="display-font text-5xl leading-[0.95] tracking-[0.01em] text-black">Commissioned Art</h2>
              <h3 className="text-3xl font-bold">What Is It?</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Commissioned art is a custom artwork created specifically for you. Instead of purchasing a pre-made
                piece, you collaborate directly with the artist to bring your vision to life. From the concept and
                subject to the style, colors, and size, every detail is tailored to fit your idea and your space.
              </p>
              <h3 className="text-3xl font-bold">Why It Matters</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Commissioned artwork allows you to own something truly unique. It reflects your personality, your
                story, or the atmosphere you want to create in your home or business. Because it&apos;s made specifically
                for you, it becomes more than just decoration-it becomes a meaningful piece of art that holds value and
                personal connection.
              </p>
            </article>

            <article className="space-y-4 border-t border-black/25 pt-8 md:border-t-0 md:border-l md:pl-8 md:pt-0">
              <h2 className="display-font text-5xl leading-[0.95] tracking-[0.01em] text-black">Mural Art</h2>
              <h3 className="text-3xl font-bold">What Is It?</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Mural art is large-scale artwork painted directly onto walls or surfaces. Murals transform ordinary
                spaces into immersive visual experiences, turning blank walls into powerful artistic statements. They
                can be created for businesses, gyms, restaurants, offices, or private homes.
              </p>
              <h3 className="text-3xl font-bold">Why It Matters</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Murals bring energy, identity, and personality to a space. For businesses, they help create a
                memorable environment and strengthen brand presence. For homes or private spaces, they add a bold and
                artistic atmosphere that cannot be replicated with traditional decor.
              </p>
            </article>

            <article className="space-y-4 border-t border-black/25 pt-8 xl:border-t-0 xl:border-l xl:pl-8 xl:pt-0">
              <h2 className="display-font text-5xl leading-[0.95] tracking-[0.01em] text-black">Canvas Art</h2>
              <h3 className="text-3xl font-bold">What Is It?</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Canvas art refers to original paintings created on stretched canvas. These artworks can range from
                small statement pieces to large focal works designed to enhance the aesthetic of a room. Each canvas
                is hand-painted, making every piece unique.
              </p>
              <h3 className="text-3xl font-bold">Why It Matters</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Canvas art adds character and artistic depth to a space. Unlike mass-produced prints, original canvas
                artwork carries the artist&apos;s touch, creativity, and authenticity. It creates a visual focal point while
                giving your space a more personal and elevated feel.
              </p>
            </article>

            <article className="space-y-4 border-t border-black/25 pt-8 xl:border-t-0 xl:border-l xl:pl-8 xl:pt-0">
              <h2 className="display-font text-5xl leading-[0.95] tracking-[0.01em] text-black">Digital Design</h2>
              <h3 className="text-3xl font-bold">What Is It?</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Digital design builds the visual identity of your brand through logo systems, graphic direction, and
                high-impact assets for digital and print use. This includes custom logo creation, typographic style,
                and brand visuals designed to look consistent across social media, merchandise, and marketing pieces.
              </p>
              <h3 className="text-3xl font-bold">Why It Matters</h3>
              <p className="font-serif text-base leading-relaxed text-black/90 sm:text-lg">
                Strong digital design makes your brand instantly recognizable and more professional. Instead of random
                visuals, you get a clear and unified look that helps people remember your business, trust your quality,
                and connect emotionally with your message from first impression to final conversion.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto mt-14 w-full max-w-7xl px-5 sm:px-7 lg:px-10">
          <div className="grid gap-6 md:grid-cols-3">
            {primaryCards.map((card) => (
              <article key={card.title} className="space-y-3">
                <Link
                  to={`/services/${card.slug}`}
                  className="group block cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#ece9e4]"
                  aria-label={`Open ${card.title} service page`}
                >
                  <div className="relative overflow-hidden border border-black/15 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.1)] transition duration-300 group-hover:-translate-y-1 group-hover:border-black/45 group-hover:shadow-[0_18px_38px_rgba(0,0,0,0.2)] group-focus-visible:-translate-y-1 group-focus-visible:border-black/45 group-focus-visible:shadow-[0_18px_38px_rgba(0,0,0,0.2)]">
                    <div className="relative h-[340px] w-full">
                      {card.items.length > 0 ? (
                        card.items.map((item, index) => {
                          const activeIndex = Math.min(activeIndexBySlot[card.slotKey] || 0, Math.max(0, card.items.length - 1))
                          return (
                            <img
                              key={item.id || item.image_url}
                              src={item.image_url}
                              alt={card.title}
                              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                                index === activeIndex ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                          )
                        })
                      ) : (
                        <div className="absolute inset-0 bg-black" />
                      )}

                      <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/80 bg-black/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
                        Click to open
                        <FiArrowUpRight size={12} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>

                      <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition duration-300 group-hover:border-white/60 group-focus-visible:border-white/60" />

                      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.7))] px-4 pb-4 pt-12 text-white opacity-0 transition duration-300 group-hover:opacity-100">
                        <p className="display-font text-xs tracking-[0.25em]">OPEN SERVICE PAGE</p>
                      </div>

                      {isAdmin ? (
                        <button
                          type="button"
                          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/65 text-white transition hover:border-white hover:bg-black/85"
                          onClick={(event) => {
                            event.preventDefault()
                            openSlotEditor(card.slotKey)
                          }}
                          aria-label={`Edit ${card.title} carousel`}
                        >
                          <FiEdit2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <h3 className="display-font text-4xl tracking-[0.01em] text-black">{card.title}</h3>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/70 transition group-hover:text-black">
                      View details
                      <FiArrowUpRight size={13} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-10 text-center display-font text-xl uppercase tracking-[0.28em] text-black/80 sm:text-2xl">
            Digital Design
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-6">
            {digitalDesignCards.map((card) => (
              <article key={card.title} className="w-full space-y-3 md:w-[calc((100%-3rem)/3)]">
                <Link
                  to={`/services/${card.slug}`}
                  className="group block cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#ece9e4]"
                  aria-label={`Open ${card.title} service page`}
                >
                  <div className="relative overflow-hidden border border-black/15 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.1)] transition duration-300 group-hover:-translate-y-1 group-hover:border-black/45 group-hover:shadow-[0_18px_38px_rgba(0,0,0,0.2)] group-focus-visible:-translate-y-1 group-focus-visible:border-black/45 group-focus-visible:shadow-[0_18px_38px_rgba(0,0,0,0.2)]">
                    <div className="relative h-[340px] w-full">
                      {card.items.length > 0 ? (
                        card.items.map((item, index) => {
                          const activeIndex = Math.min(activeIndexBySlot[card.slotKey] || 0, Math.max(0, card.items.length - 1))
                          return (
                            <img
                              key={item.id || item.image_url}
                              src={item.image_url}
                              alt={card.title}
                              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                                index === activeIndex ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                          )
                        })
                      ) : (
                        <div className="absolute inset-0 bg-black" />
                      )}

                      <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/80 bg-black/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
                        Click to open
                        <FiArrowUpRight size={12} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>

                      <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition duration-300 group-hover:border-white/60 group-focus-visible:border-white/60" />

                      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.7))] px-4 pb-4 pt-12 text-white opacity-0 transition duration-300 group-hover:opacity-100">
                        <p className="display-font text-xs tracking-[0.25em]">OPEN SERVICE PAGE</p>
                      </div>

                      {isAdmin ? (
                        <button
                          type="button"
                          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/65 text-white transition hover:border-white hover:bg-black/85"
                          onClick={(event) => {
                            event.preventDefault()
                            openSlotEditor(card.slotKey)
                          }}
                          aria-label={`Edit ${card.title} carousel`}
                        >
                          <FiEdit2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <h3 className="display-font text-4xl tracking-[0.01em] text-black">{card.title}</h3>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/70 transition group-hover:text-black">
                      View details
                      <FiArrowUpRight size={13} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-12 text-center text-[11px] uppercase tracking-[0.32em] text-black/70">Instagram</p>
          <a
            href="https://www.instagram.com/_madeby.vic/"
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-3 block w-fit text-center text-xl font-semibold text-black underline decoration-black/40 underline-offset-4 transition hover:text-black/70"
          >
            @_madeby.Vic
          </a>
        </section>

        {isAdmin && !showCropModal && showSlotEditorModal && editingSlotKey ? (
          <div className="fixed inset-0 z-[118] bg-black/80 p-4 backdrop-blur-sm sm:p-6" onClick={closeSlotEditor}>
            <div
              className="mx-auto w-full max-w-3xl rounded-sm border border-white/20 bg-black/90 p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="display-font text-xs tracking-[0.2em] text-white/75">EDIT CAROUSEL SETTINGS</p>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                  onClick={closeSlotEditor}
                  aria-label="Close editor modal"
                >
                  <FiX size={16} />
                </button>
              </div>
              {renderSlotEditor(editingSlotKey, slotByKey[editingSlotKey]?.label || 'Carousel')}
            </div>
          </div>
        ) : null}

        {isAdmin && showCropModal && pendingPreviewUrl ? (
          <div className="fixed inset-0 z-[120] bg-black/80 p-4 backdrop-blur-sm sm:p-6">
            <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-sm border border-white/25 bg-black/90 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="display-font text-xs tracking-[0.2em] text-white/75">ADJUST IMAGE CROP</p>
                  <p className="mt-1 text-sm text-white/70">The frame matches the exact final image ratio for this section.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                  onClick={closeCropModal}
                  aria-label="Close crop modal"
                >
                  <FiX size={16} />
                </button>
              </div>

              {servicesPageAdminError ? <p className="mb-3 text-sm text-red-300">{servicesPageAdminError}</p> : null}
              {servicesPageAdminMessage ? <p className="mb-3 text-sm text-emerald-300">{servicesPageAdminMessage}</p> : null}

              <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm border border-white/20 bg-black/70">
                <Cropper
                  image={pendingPreviewUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={pendingSlotAspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
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
                  onClick={handleConfirmUpload}
                  disabled={savingSlotKey === pendingSlotKey || !croppedAreaPixels}
                >
                  {savingSlotKey === pendingSlotKey ? 'Uploading...' : 'Confirm and Upload'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}

export default ServicesPage
