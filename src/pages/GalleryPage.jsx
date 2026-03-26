import { useEffect, useMemo, useRef, useState } from 'react'
import Masonry from 'react-masonry-css'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FiUploadCloud,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiMove,
  FiTrash2,
} from 'react-icons/fi'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../context/AuthContext'
import { supabase, supabaseReady } from '../lib/supabase'

const galleryBucket = (import.meta.env.VITE_SUPABASE_GALLERY_BUCKET || 'gallery-images').trim()
const maxUploadBytes = Number(import.meta.env.VITE_GALLERY_MAX_UPLOAD_BYTES || 3 * 1024 * 1024)
const minWidthPx = Number(import.meta.env.VITE_GALLERY_MIN_WIDTH_PX || 1000)
const minHeightPx = Number(import.meta.env.VITE_GALLERY_MIN_HEIGHT_PX || 700)
const minAspectRatio = Number(import.meta.env.VITE_GALLERY_MIN_ASPECT_RATIO || 0.5)
const maxAspectRatio = Number(import.meta.env.VITE_GALLERY_MAX_ASPECT_RATIO || 2.4)

const masonryBreakpoints = {
  default: 3,
  1180: 3,
  860: 2,
  640: 1,
}

const bytesToMb = (value) => `${(value / (1024 * 1024)).toFixed(1)} MB`

const safeFileName = (value) =>
  String(value || 'image.jpg')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')

const getImageSize = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    const clear = () => {
      URL.revokeObjectURL(objectUrl)
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      const payload = { width: image.naturalWidth, height: image.naturalHeight }
      clear()
      resolve(payload)
    }

    image.onerror = () => {
      clear()
      reject(new Error('Could not read image dimensions. Please choose a different file.'))
    }

    image.src = objectUrl
  })

const getAspectRatio = (item) => {
  const width = Number(item?.width || 0)
  const height = Number(item?.height || 0)

  if (!width || !height) return 1

  return width / height
}

const greatestCommonDivisor = (a, b) => {
  let x = Math.abs(Number(a || 0))
  let y = Math.abs(Number(b || 0))

  while (y) {
    const temp = y
    y = x % y
    x = temp
  }

  return x || 1
}

const getReducedRatioKey = (item) => {
  const width = Number(item?.width || 0)
  const height = Number(item?.height || 0)

  if (!width || !height) {
    return 'unknown'
  }

  const divisor = greatestCommonDivisor(width, height)
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`
}

const isLandscape = (item) => getAspectRatio(item) > 1

const areRatiosVerySimilar = (firstItem, secondItem) => {
  const ratioA = getAspectRatio(firstItem)
  const ratioB = getAspectRatio(secondItem)

  if (!ratioA || !ratioB) {
    return false
  }

  // Symmetric tolerance for close ratios (for example 1:1 with 0.97:1).
  const normalizedDifference = Math.abs(Math.log(ratioA / ratioB))
  return normalizedDifference <= 0.08
}

const buildMobileRows = (orderedImages) => {
  const rows = []

  for (let index = 0; index < orderedImages.length; index += 1) {
    const current = orderedImages[index]
    const next = orderedImages[index + 1]

    if (!current) {
      continue
    }

    // Respect manual order: only adjacent images can form a 2x2 pair.
    if (
      next &&
      !isLandscape(current) &&
      !isLandscape(next) &&
      (getReducedRatioKey(current) === getReducedRatioKey(next) ||
        areRatiosVerySimilar(current, next))
    ) {
      rows.push({ type: 'pair', items: [current, next] })
      index += 1
      continue
    }

    rows.push({ type: 'single', items: [current] })
  }

  return rows
}

function SortableManagerItem({ image, index, isDeleting, onDelete }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group overflow-hidden rounded-[20px] border bg-[#faf8f2] transition ${
        isDragging ? 'border-black/30 opacity-70 shadow-[0_20px_45px_rgba(0,0,0,0.18)]' : 'border-black/10 hover:border-black/25'
      }`}
    >
      <div className="relative">
        <img src={image.image_url} alt={`Reorder item ${index + 1}`} className="h-36 w-full object-cover sm:h-40" />

        <div className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white">
          #{index + 1}
        </div>

        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          className="absolute right-3 top-3 flex h-9 w-9 touch-none items-center justify-center rounded-full bg-white/90 text-[#111111] shadow-sm cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <FiMove />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onDelete(image)
          }}
          className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-500/30 bg-white/95 text-red-600 shadow-sm transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Delete image"
          disabled={isDeleting}
        >
          <FiTrash2 />
        </button>
      </div>

      <div className="px-3 py-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-black/45">Ratio group {getReducedRatioKey(image)}</p>
      </div>
    </div>
  )
}

function GalleryPage() {
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef(null)

  const [images, setImages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [managerImages, setManagerImages] = useState([])
  const [managerInitialImages, setManagerInitialImages] = useState([])
  const [draggedId, setDraggedId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )

  const canUpload = Boolean(user)

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      const orderA = Number(a.sort_order || 0)
      const orderB = Number(b.sort_order || 0)

      if (orderA !== orderB) {
        return orderB - orderA
      }

      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
  }, [images])

  const mobileRows = useMemo(() => buildMobileRows(sortedImages), [sortedImages])

  const activeImage = lightboxIndex === null ? null : sortedImages[lightboxIndex]

  const closeLightbox = () => setLightboxIndex(null)

  const showPrev = () => {
    if (lightboxIndex === null || sortedImages.length === 0) return
    setLightboxIndex((lightboxIndex - 1 + sortedImages.length) % sortedImages.length)
  }

  const showNext = () => {
    if (lightboxIndex === null || sortedImages.length === 0) return
    setLightboxIndex((lightboxIndex + 1) % sortedImages.length)
  }

  useEffect(() => {
    const total = sortedImages.length

    const onKeyDown = (event) => {
      if (lightboxIndex === null || total === 0) return

      if (event.key === 'Escape') closeLightbox()

      if (event.key === 'ArrowLeft') {
        setLightboxIndex((current) => {
          if (current === null) return null
          return (current - 1 + total) % total
        })
      }

      if (event.key === 'ArrowRight') {
        setLightboxIndex((current) => {
          if (current === null) return null
          return (current + 1) % total
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxIndex, sortedImages.length])

  useEffect(() => {
    if (lightboxIndex === null) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [lightboxIndex])

  useEffect(() => {
    if (!showUploadPanel) {
      return
    }

    setManagerImages(sortedImages)
    setManagerInitialImages(sortedImages)
  }, [sortedImages, showUploadPanel])

  const loadImages = async () => {
    setErrorMessage('')

    if (!supabaseReady || !supabase) {
      setIsLoading(false)
      setErrorMessage('Gallery is temporarily unavailable because Supabase is not configured.')
      return
    }

    const { data, error } = await supabase
      .schema('app')
      .from('gallery_images')
      .select('id, image_url, storage_path, width, height, sort_order, created_at, created_by')
      .eq('is_active', true)
      .order('sort_order', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage('Could not load gallery images. Please refresh the page.')
      setIsLoading(false)
      return
    }

    setImages(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    loadImages()
  }, [])

  const validateFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed.')
    }

    if (file.size > maxUploadBytes) {
      throw new Error(`Image exceeds the ${bytesToMb(maxUploadBytes)} limit.`)
    }

    const { width, height } = await getImageSize(file)
    const ratio = width / height

    if (width < minWidthPx) {
      throw new Error(`Image width must be at least ${minWidthPx}px.`)
    }

    if (height < minHeightPx) {
      throw new Error(`Image height must be at least ${minHeightPx}px.`)
    }

    if (ratio < minAspectRatio || ratio > maxAspectRatio) {
      throw new Error(
        `Image aspect ratio must stay between ${minAspectRatio.toFixed(2)} and ${maxAspectRatio.toFixed(2)}.`,
      )
    }

    return { width, height }
  }

  const uploadFiles = async (fileList) => {
    if (!canUpload || !user?.id) {
      setErrorMessage('Please sign in to upload images.')
      return
    }

    if (!supabaseReady || !supabase) {
      setErrorMessage('Upload is unavailable because Supabase is not configured.')
      return
    }

    const files = Array.from(fileList || [])
    if (files.length === 0) return

    setIsUploading(true)
    setErrorMessage('')
    setSuccessMessage('')

    let uploadedCount = 0
    let nextSortOrder =
      images.length > 0
        ? Math.max(...images.map((item) => Number(item.sort_order || 0))) + 1
        : 1

    for (const file of files) {
      let filePath = ''

      try {
        const dimensions = await validateFile(file)
        const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
        const fileName = safeFileName(file.name) || `upload-${Date.now()}.${extension}`
        filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName}`

        const { error: uploadError } = await supabase.storage
          .from(galleryBucket)
          .upload(filePath, file, { upsert: false, contentType: file.type })

        if (uploadError) {
          throw new Error(uploadError.message || 'Storage upload failed.')
        }

        const { data: publicUrlData } = supabase.storage.from(galleryBucket).getPublicUrl(filePath)

        if (!publicUrlData?.publicUrl) {
          await supabase.storage.from(galleryBucket).remove([filePath])
          throw new Error('Could not generate public URL.')
        }

        const publicUrl = publicUrlData.publicUrl

        const { data: inserted, error: insertError } = await supabase
          .schema('app')
          .from('gallery_images')
          .insert({
            image_url: publicUrl,
            storage_path: filePath,
            width: dimensions.width,
            height: dimensions.height,
            file_size_bytes: file.size,
            created_by: user.id,
            is_active: true,
            sort_order: nextSortOrder,
          })
          .select('id, image_url, storage_path, width, height, sort_order, created_at, created_by')
          .single()

        if (insertError) {
          await supabase.storage.from(galleryBucket).remove([filePath])
          throw new Error(insertError.message || 'Database insert failed.')
        }

        setImages((prev) => [inserted, ...prev])
        uploadedCount += 1
        nextSortOrder += 1
      } catch (error) {
        setErrorMessage(error?.message || 'Upload failed. Please try another image.')
      }
    }

    if (uploadedCount > 0) {
      setSuccessMessage(
        uploadedCount === 1
          ? 'Image uploaded successfully.'
          : `${uploadedCount} images uploaded successfully.`,
      )
    }

    setIsUploading(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragStart = (event) => {
    setDraggedId(String(event.active.id))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (!active?.id || !over?.id) {
      setDraggedId(null)
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) {
      setDraggedId(null)
      return
    }

    const fromIndex = managerImages.findIndex((item) => item.id === activeId)
    const toIndex = managerImages.findIndex((item) => item.id === overId)

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null)
      return
    }

    setManagerImages((prev) => arrayMove(prev, fromIndex, toIndex))
    setDraggedId(null)
  }

  const handleDragCancel = () => {
    setDraggedId(null)
  }

  const saveManualOrder = async () => {
    if (!canUpload || !supabaseReady || !supabase || managerImages.length === 0) return

    setIsSavingOrder(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const total = managerImages.length

      for (let index = 0; index < managerImages.length; index += 1) {
        const item = managerImages[index]
        const nextSortOrder = total - index

        const { error } = await supabase
          .schema('app')
          .from('gallery_images')
          .update({ sort_order: nextSortOrder })
          .eq('id', item.id)

        if (error) {
          throw new Error(error.message || 'Could not save gallery order.')
        }
      }

      setImages((prev) =>
        prev.map((item) => {
          const index = managerImages.findIndex((img) => img.id === item.id)
          if (index === -1) return item

          return {
            ...item,
            sort_order: total - index,
          }
        }),
      )

      setSuccessMessage('Gallery order updated successfully.')
    } catch (error) {
      setErrorMessage(error?.message || 'Could not save gallery order.')
    } finally {
      setIsSavingOrder(false)
    }
  }

  const resetManualOrder = () => {
    setManagerImages(managerInitialImages)
    setDraggedId(null)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleDeleteImage = async (image) => {
    if (!image?.id || !canUpload || !supabaseReady || !supabase) {
      return
    }

    const approved = window.confirm('Delete this image permanently from gallery and storage?')
    if (!approved) {
      return
    }

    setDeletingImageId(image.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error: deleteRowError } = await supabase
        .schema('app')
        .from('gallery_images')
        .delete()
        .eq('id', image.id)

      if (deleteRowError) {
        throw new Error(deleteRowError.message || 'Could not delete image record.')
      }

      if (image.storage_path) {
        const { error: deleteObjectError } = await supabase.storage
          .from(galleryBucket)
          .remove([image.storage_path])

        if (deleteObjectError) {
          throw new Error(deleteObjectError.message || 'Image record deleted, but storage cleanup failed.')
        }
      }

      setImages((prev) => prev.filter((item) => item.id !== image.id))
      setManagerImages((prev) => prev.filter((item) => item.id !== image.id))
      setManagerInitialImages((prev) => prev.filter((item) => item.id !== image.id))
      setDraggedId((prev) => (prev === image.id ? null : prev))
      setLightboxIndex((current) => {
        if (current === null) {
          return null
        }

        const active = sortedImages[current]
        if (active?.id === image.id) {
          return null
        }

        return current
      })
      setSuccessMessage('Image deleted successfully from gallery and storage.')
    } catch (error) {
      setErrorMessage(error?.message || 'Could not delete image.')
    } finally {
      setDeletingImageId('')
    }
  }

  return (
    <div className="min-h-screen bg-[#f2efe8] text-[#111111]">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-12 sm:px-6 sm:pt-14 lg:px-10 lg:pt-16">
        <section className="mb-8 border-b border-black/10 pb-8 pt-0">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="display-font text-[11px] uppercase tracking-[0.35em] text-black/45">
                SELECTED WORKS
              </p>

              <h1 className="display-font mt-2 text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.88] tracking-[0.02em] text-[#111111]">
                Gallery
              </h1>

              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-black/65 sm:text-base">
                A visual archive of murals, commissioned work, and original pieces. Each image keeps its real
                proportions so the gallery feels natural, editorial, and art-forward.
              </p>
            </div>

            {canUpload ? (
              <button
                type="button"
                onClick={() => setShowUploadPanel((prev) => !prev)}
                className="inline-flex h-fit items-center justify-center rounded-full border border-black/15 bg-white px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-[#111111] transition hover:border-black/30 hover:bg-black hover:text-white"
              >
                {showUploadPanel ? 'Close manager' : 'Manage gallery'}
              </button>
            ) : null}
          </div>
        </section>

        {canUpload && showUploadPanel ? (
          <section className="mb-10 rounded-[28px] border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.05)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <h2 className="display-font text-xl tracking-[0.08em] text-[#111111]">Upload images</h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Upload one or multiple images. The gallery will place them automatically in a masonry layout.
                </p>

                <div className="mt-4 grid gap-2 text-sm text-black/55 sm:grid-cols-2">
                  <p>Minimum width: {minWidthPx}px</p>
                  <p>Minimum height: {minHeightPx}px</p>
                  <p>Maximum size: {bytesToMb(maxUploadBytes)}</p>
                  <p>Balanced aspect ratio only</p>
                </div>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-black/15 bg-[#111111] px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-white transition hover:bg-black disabled:pointer-events-none disabled:opacity-60">
                <FiUploadCloud className="text-lg" aria-hidden="true" />
                <span>{isUploading ? 'Uploading...' : 'Select images'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  disabled={isUploading}
                  onChange={(event) => uploadFiles(event.target.files)}
                />
              </label>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            {managerImages.length > 0 ? (
              <div className="mt-6 border-t border-black/10 pt-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="display-font text-lg tracking-[0.08em] text-[#111111]">Manual order</h3>
                    <p className="mt-1 text-sm text-black/55">
                      Drag the images to reorder them, then save.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetManualOrder}
                      className="rounded-full border border-black/15 bg-white px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#111111] transition hover:border-black/30"
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={saveManualOrder}
                      disabled={isSavingOrder}
                      className="rounded-full border border-black/15 bg-[#111111] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-black disabled:opacity-60"
                    >
                      {isSavingOrder ? 'Saving...' : 'Save order'}
                    </button>
                  </div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext items={managerImages.map((image) => image.id)} strategy={rectSortingStrategy}>
                    <div
                      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${
                        draggedId ? 'cursor-grabbing' : 'cursor-default'
                      }`}
                    >
                      {managerImages.map((image, index) => (
                        <SortableManagerItem
                          key={`manager-${image.id}`}
                          image={image}
                          index={index}
                          isDeleting={deletingImageId === image.id}
                          onDelete={handleDeleteImage}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ) : null}
          </section>
        ) : null}

        {isLoading || authLoading ? (
          <>
            <section className="grid grid-cols-2 gap-3 md:hidden">
              {Array.from({ length: 8 }).map((_, index) => {
                const heights = ['h-[210px]', 'h-[270px]', 'h-[230px]', 'h-[290px]']
                return (
                  <div
                    key={`mobile-placeholder-${index}`}
                    className={`animate-pulse rounded-[22px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] ${heights[index % heights.length]}`}
                  />
                )
              })}
            </section>

            <section className="hidden grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 md:grid">
              {Array.from({ length: 9 }).map((_, index) => {
                const heights = ['h-[280px]', 'h-[460px]', 'h-[380px]', 'h-[520px]', 'h-[340px]']
                return (
                  <div
                    key={`desktop-placeholder-${index}`}
                    className={`animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] ${heights[index % heights.length]}`}
                  />
                )
              })}
            </section>
          </>
        ) : sortedImages.length > 0 ? (
          <>
            <section className="md:hidden">
              {mobileRows.map((row) => (
                <div
                  key={`mobile-row-${row.items.map((item) => item.id).join('-')}`}
                  className={row.type === 'pair' ? 'mb-3 grid grid-cols-2 gap-3' : 'mb-3'}
                >
                  {row.items.map((image) => {
                    const index = sortedImages.findIndex((item) => item.id === image.id)
                    return (
                      <button
                        key={`mobile-${image.id}`}
                        type="button"
                        className="group block w-full overflow-hidden rounded-[22px] bg-white text-left shadow-[0_10px_28px_rgba(0,0,0,0.05)] ring-1 ring-black/5 transition duration-300"
                        onClick={() => setLightboxIndex(index)}
                      >
                        <div className="relative overflow-hidden">
                          <img
                            src={image.image_url}
                            alt={`Gallery artwork ${index + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-auto w-full transition duration-500 group-hover:scale-[1.018]"
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </section>

            <section className="hidden md:block">
              <Masonry
                breakpointCols={masonryBreakpoints}
                className="flex w-auto -ml-5"
                columnClassName="pl-5 bg-clip-padding"
              >
                {sortedImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className="group mb-5 block w-full overflow-hidden rounded-[28px] bg-white text-left shadow-[0_10px_35px_rgba(0,0,0,0.06)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
                    onClick={() => setLightboxIndex(index)}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={image.image_url}
                        alt={`Gallery artwork ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-auto w-full transition duration-500 group-hover:scale-[1.018]"
                      />

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                        <span className="rounded-full bg-black/75 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white">
                          Open
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </Masonry>
            </section>
          </>
        ) : (
          <section className="rounded-[32px] border border-dashed border-black/15 bg-white/60 px-6 py-20 text-center">
            <h3 className="display-font text-2xl tracking-[0.08em] text-[#111111]">No images yet</h3>
            <p className="mt-3 text-sm text-black/55">Upload the first image to start building the gallery.</p>
          </section>
        )}
      </main>

      {activeImage ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/94 px-3 py-6 sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-2xl text-white transition hover:bg-white hover:text-black"
            onClick={closeLightbox}
            aria-label="Close preview"
          >
            <FiX />
          </button>

          <div className="absolute left-4 top-4 rounded-full bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white/85">
            {lightboxIndex + 1} / {sortedImages.length}
          </div>

          {sortedImages.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/55 text-2xl text-white transition hover:bg-white hover:text-black sm:left-5"
                onClick={showPrev}
                aria-label="Previous image"
              >
                <FiChevronLeft />
              </button>

              <button
                type="button"
                className="absolute right-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/55 text-2xl text-white transition hover:bg-white hover:text-black sm:right-5"
                onClick={showNext}
                aria-label="Next image"
              >
                <FiChevronRight />
              </button>
            </>
          ) : null}

          <img
            src={activeImage.image_url}
            alt="Gallery full preview"
            className="max-h-[88vh] max-w-[95vw] rounded-[24px] object-contain shadow-[0_25px_80px_rgba(0,0,0,0.35)]"
          />
        </div>
      ) : null}

      <SiteFooter />
    </div>
  )
}

export default GalleryPage