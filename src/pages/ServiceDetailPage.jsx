import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { FiEdit2, FiX } from 'react-icons/fi'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import SiteHeader from '../components/SiteHeader'
import { useAuth } from '../context/AuthContext'
import { supabase, supabaseReady } from '../lib/supabase'
import { serviceDetails } from '../data/serviceDetails'

const servicePageBucket = (import.meta.env.VITE_SUPABASE_SERVICE_BUCKET || 'service-images').trim()
const defaultSlotSpeedMs = 5200
const maxServicesUploadBytes = Number(import.meta.env.VITE_SERVICE_PAGE_MAX_UPLOAD_BYTES || 1024 * 1024)

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

function ServiceDetailPage() {
  const { slug } = useParams()
  const service = useMemo(() => serviceDetails.find((item) => item.slug === slug), [slug])

  const { user, profile } = useAuth()
  const isAdmin = profile?.is_admin === true

  const [slotImages, setSlotImages] = useState([])
  const [speedInput, setSpeedInput] = useState(String(Math.round(defaultSlotSpeedMs / 1000)))
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const [adminError, setAdminError] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [showEditorModal, setShowEditorModal] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const withErrorDetails = (baseMessage, error) => {
    if (!error) {
      return baseMessage
    }
    const details = [error.message, error.statusCode, error.error].filter(Boolean).join(' | ')
    return details ? `${baseMessage} Details: ${details}` : baseMessage
  }

  const clearFeedback = () => {
    setAdminError('')
    setAdminMessage('')
  }

  const loadSlotData = async () => {
    if (!service || !supabaseReady || !supabase) {
      return
    }

    const { data: imagesData, error: imagesError } = await supabase
      .schema('app')
      .from('services_page_images')
      .select('id, slot_key, image_url, sort_order, is_active, created_at')
      .eq('slot_key', service.slotKey)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!imagesError) {
      setSlotImages(imagesData || [])
    }

    const { data: settingsData } = await supabase
      .schema('app')
      .from('services_page_settings')
      .select('speed_ms')
      .eq('slot_key', service.slotKey)
      .maybeSingle()

    const nextSpeed = Math.max(1200, Number(settingsData?.speed_ms || defaultSlotSpeedMs))
    setSpeedInput(String(Math.round(nextSpeed / 1000)))
  }

  useEffect(() => {
    loadSlotData()
  }, [service?.slotKey])

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [slotImages])

  const shouldLockPageScroll = showEditorModal || showCropModal
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

  const openCropModal = (event) => {
    clearFeedback()

    if (!isAdmin) {
      setAdminError('You do not have permission to edit images.')
      return
    }

    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setAdminError('Only image files are allowed.')
      event.target.value = ''
      return
    }

    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingPreviewUrl(previewUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setShowCropModal(true)
    event.target.value = ''
  }

  const closeCropModal = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl)
    }
    setShowCropModal(false)
    setPendingFile(null)
    setPendingPreviewUrl('')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const handleConfirmUpload = async () => {
    clearFeedback()

    if (!isAdmin) {
      setAdminError('You do not have permission to edit images.')
      return
    }

    if (!supabaseReady || !supabase || !service) {
      setAdminError('Service is temporarily unavailable.')
      return
    }

    if (!pendingFile || !pendingPreviewUrl || !croppedAreaPixels) {
      setAdminError('Select an image and adjust the crop before uploading.')
      return
    }

    setIsSaving(true)

    let croppedBlob
    try {
      croppedBlob = await getCroppedBlob(pendingPreviewUrl, croppedAreaPixels, 'image/jpeg')
      croppedBlob = await optimizeBlobForUpload(croppedBlob, maxServicesUploadBytes)
    } catch {
      setAdminError('Could not prepare the image for upload.')
      setIsSaving(false)
      return
    }

    if (croppedBlob.size > maxServicesUploadBytes) {
      setAdminError(`Image is still too large (${Math.ceil(croppedBlob.size / 1024)}KB). Please use a smaller file.`)
      setIsSaving(false)
      return
    }

    const baseName =
      pendingFile.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || service.slotKey
    const cleanFileName = `${baseName}-${Date.now()}.jpg`
    const folderPath = `services-page/${user?.id || 'admin'}/${service.slotKey}`
    const objectPath = `${folderPath}/${cleanFileName}`

    const { error: uploadError } = await supabase.storage.from(servicePageBucket).upload(objectPath, croppedBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/jpeg',
    })

    if (uploadError) {
      setAdminError(withErrorDetails('Could not upload the image.', uploadError))
      setIsSaving(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from(servicePageBucket).getPublicUrl(objectPath)
    const imageUrl = publicUrlData?.publicUrl

    if (!imageUrl) {
      setAdminError('Could not generate the image URL.')
      setIsSaving(false)
      return
    }

    const { error: dbError } = await supabase
      .schema('app')
      .from('services_page_images')
      .insert({
        slot_key: service.slotKey,
        image_url: imageUrl,
        sort_order: slotImages.length + 1,
        is_active: true,
      })

    if (dbError) {
      await supabase.storage.from(servicePageBucket).remove([objectPath])
      setAdminError(withErrorDetails('Could not save the image record.', dbError))
      setIsSaving(false)
      return
    }

    await loadSlotData()
    setAdminMessage('Image updated.')
    setIsSaving(false)
    closeCropModal()
  }

  const handleRemoveImage = async (imageRow) => {
    clearFeedback()

    if (!isAdmin) {
      setAdminError('You do not have permission to edit images.')
      return
    }

    if (!supabaseReady || !supabase) {
      setAdminError('Service is temporarily unavailable.')
      return
    }

    setIsSaving(true)

    const marker = `/object/public/${servicePageBucket}/`
    const idx = imageRow.image_url?.indexOf(marker) ?? -1
    const objectPath = idx === -1 ? null : imageRow.image_url.slice(idx + marker.length)

    const { error: dbError } = await supabase.schema('app').from('services_page_images').delete().eq('id', imageRow.id)
    if (dbError) {
      setAdminError(withErrorDetails('Could not remove the image.', dbError))
      setIsSaving(false)
      return
    }

    if (objectPath) {
      await supabase.storage.from(servicePageBucket).remove([objectPath])
    }

    await loadSlotData()
    setAdminMessage('Image removed.')
    setIsSaving(false)
  }

  const handleSaveSpeed = async () => {
    clearFeedback()

    if (!isAdmin) {
      setAdminError('You do not have permission to edit speed settings.')
      return
    }

    if (!supabaseReady || !supabase || !service) {
      setAdminError('Service is temporarily unavailable.')
      return
    }

    const parsedSeconds = Number(speedInput)
    if (!Number.isFinite(parsedSeconds) || parsedSeconds < 1.2 || parsedSeconds > 30) {
      setAdminError('Speed must be between 1.2 and 30 seconds.')
      return
    }

    const nextMs = Math.round(parsedSeconds * 1000)
    setIsSaving(true)

    const { error } = await supabase
      .schema('app')
      .from('services_page_settings')
      .upsert({ slot_key: service.slotKey, speed_ms: nextMs }, { onConflict: 'slot_key' })

    if (error) {
      setAdminError(withErrorDetails('Could not save speed settings.', error))
      setIsSaving(false)
      return
    }

    setAdminMessage('Speed updated.')
    setIsSaving(false)
  }

  if (!service) {
    return <Navigate to="/services" replace />
  }

  const imagesForCards =
    slotImages.length > 0
      ? slotImages
      : [{ id: 'fallback', image_url: `https://picsum.photos/1200/900?random=${service.slug}` }]

  const mainImage = imagesForCards[Math.min(selectedImageIndex, Math.max(0, imagesForCards.length - 1))]

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white selection:bg-white selection:text-black">
      <SiteHeader />

      <main className="pb-16">
        <section className="mx-auto mt-12 w-full max-w-7xl px-5 sm:px-7 lg:px-10">
          <div className="rounded-sm border border-white/15 bg-white/[0.03] p-7">
            <div className="grid gap-10 xl:grid-cols-[1fr_0.95fr]">
              <article className="order-2 xl:order-1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="display-font text-xs tracking-[0.34em] text-white/65">SERVICE PAGE</p>
                    <h1 className="display-font mt-3 text-4xl uppercase tracking-[0.05em] sm:text-6xl">{service.title}</h1>
                  </div>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/65 text-white transition hover:border-white hover:bg-black/85"
                      onClick={() => setShowEditorModal(true)}
                      aria-label={`Edit ${service.title} images`}
                    >
                      <FiEdit2 size={15} />
                    </button>
                  ) : null}
                </div>

                <p className="mt-8 text-lg leading-relaxed text-white/85">{service.intro}</p>
                {service.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-5 text-base leading-relaxed text-white/80">
                    {paragraph}
                  </p>
                ))}

                <div className="mt-10 flex justify-center sm:justify-start">
                  <Link
                    to="/contact"
                    className="inline-flex rounded-full border border-white bg-white px-10 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-black transition hover:scale-[1.03]"
                  >
                    Go To Contact
                  </Link>
                </div>
              </article>

              <aside className="order-1 xl:order-2">
                <p className="display-font text-xs tracking-[0.24em] text-white/60">SERVICE GALLERY</p>
                <div className="mt-4 rounded-sm border border-white/15 bg-white/[0.03] p-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-white/15 bg-black/30">
                    {mainImage ? (
                      <img src={mainImage.image_url} alt={`${service.title} main showcase`} className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {imagesForCards.map((item, index) => {
                      const isActive = index === Math.min(selectedImageIndex, Math.max(0, imagesForCards.length - 1))
                      return (
                        <button
                          key={item.id || item.image_url}
                          type="button"
                          className={`relative overflow-hidden rounded-sm border transition ${
                            isActive ? 'border-white' : 'border-white/20 hover:border-white/60'
                          }`}
                          onClick={() => setSelectedImageIndex(index)}
                          aria-label={`Show image ${index + 1}`}
                        >
                          <img src={item.image_url} alt={`${service.title} thumbnail ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-7xl px-5 sm:px-7 lg:px-10">
          <article className="rounded-sm border border-white/15 bg-white/[0.03] p-7">
            <p className="display-font text-xs tracking-[0.28em] text-white/65">OTHER SERVICES</p>
            <div className="mt-5 grid gap-3">
              {serviceDetails
                .filter((item) => item.slug !== service.slug)
                .map((item) => (
                  <Link
                    key={item.slug}
                    to={`/services/${item.slug}`}
                    className="rounded-sm border border-white/20 bg-black/35 px-4 py-3 text-sm uppercase tracking-[0.18em] text-white/85 transition hover:border-white/50 hover:bg-black/55"
                  >
                    {item.title}
                  </Link>
                ))}
            </div>
          </article>
        </section>

        {isAdmin && showEditorModal ? (
          <div className="fixed inset-0 z-[118] bg-black/80 p-4 backdrop-blur-sm sm:p-6" onClick={() => setShowEditorModal(false)}>
            <div
              className="mx-auto w-full max-w-3xl rounded-sm border border-white/20 bg-black/90 p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="display-font text-xs tracking-[0.2em] text-white/75">EDIT {service.title.toUpperCase()} CAROUSEL</p>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                  onClick={() => setShowEditorModal(false)}
                  aria-label="Close editor modal"
                >
                  <FiX size={16} />
                </button>
              </div>

              {adminError ? <p className="mb-3 text-sm text-red-300">{adminError}</p> : null}
              {adminMessage ? <p className="mb-3 text-sm text-emerald-300">{adminMessage}</p> : null}

              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="field-wrap">
                  <span>Speed (seconds)</span>
                  <input
                    type="number"
                    min="1.2"
                    max="30"
                    step="0.1"
                    value={speedInput}
                    onChange={(event) => setSpeedInput(event.target.value)}
                  />
                </label>
                <button type="button" className="action-btn action-btn-outline justify-center" onClick={handleSaveSpeed} disabled={isSaving}>
                  Save Speed
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Images ({slotImages.length})</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/35 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:border-white hover:bg-white/90">
                  {isSaving ? 'Saving...' : '+ Change'}
                  <input type="file" accept="image/*" className="sr-only" onChange={openCropModal} disabled={isSaving} />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {slotImages.map((img) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-sm border border-white/15 bg-black/50">
                    <img src={img.image_url} alt={service.title} className="h-16 w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-sm border border-white/70 bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                      onClick={() => handleRemoveImage(img)}
                      disabled={isSaving}
                      aria-label="Remove image"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isAdmin && showCropModal && pendingPreviewUrl ? (
          <div className="fixed inset-0 z-[120] bg-black/80 p-4 backdrop-blur-sm sm:p-6">
            <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-sm border border-white/25 bg-black/90 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="display-font text-xs tracking-[0.2em] text-white/75">ADJUST IMAGE CROP</p>
                  <p className="mt-1 text-sm text-white/70">The frame matches the exact final image ratio for this service.</p>
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

              {adminError ? <p className="mb-3 text-sm text-red-300">{adminError}</p> : null}
              {adminMessage ? <p className="mb-3 text-sm text-emerald-300">{adminMessage}</p> : null}

              <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm border border-white/20 bg-black/70">
                <Cropper
                  image={pendingPreviewUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={service.aspect}
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
                  disabled={isSaving || !croppedAreaPixels}
                >
                  {isSaving ? 'Uploading...' : 'Confirm and Upload'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default ServiceDetailPage
