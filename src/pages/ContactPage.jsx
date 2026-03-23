import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiEdit2 } from 'react-icons/fi'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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

  const maxOutputSide = 2600
  const outputWidth = Math.max(1, Math.round(cropPixels.width))
  const outputHeight = Math.max(1, Math.round(cropPixels.height))
  const scale = Math.min(1, maxOutputSide / Math.max(outputWidth, outputHeight))
  canvas.width = Math.max(1, Math.floor(outputWidth * scale))
  canvas.height = Math.max(1, Math.floor(outputHeight * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare canvas context for crop.')

  ctx.drawImage(image, cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Failed to generate cropped image.'))
      else resolve(blob)
    }, outputType, 0.92)
  })
}

function ContactPage() {
  const { canEditAsAdmin } = useAuth()
  const isAdmin = canEditAsAdmin === true
  const contactImageKey = 'contact-page-hero'

  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Cropper states
  const [showCropModal, setShowCropModal] = useState(false)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    newsletter: false,
    phone: '',
    services: [],
    budget: '',
    howHeard: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchImage() {
      const { data } = await supabase.schema('app').from('service_images').select('image_url').eq('service_key', contactImageKey).maybeSingle()
      if (data?.image_url) setImageUrl(data.image_url)
    }
    fetchImage()
  }, [])

  const handleImageFileChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    const reader = new FileReader()
    reader.onload = () => {
      setPendingPreviewUrl(reader.result)
      setShowCropModal(true)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const closeCropModal = () => {
    setShowCropModal(false)
    setPendingPreviewUrl('')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const handleCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }

  const handleConfirmUpload = async () => {
    if (!croppedAreaPixels || !pendingPreviewUrl) return
    setUploadingImage(true)
    
    try {
      const blob = await getCroppedBlob(pendingPreviewUrl, croppedAreaPixels, 'image/jpeg')
      
      const bucketName = (import.meta.env.VITE_SUPABASE_SERVICE_BUCKET || 'service-images').trim()
      const objectPath = `contact-hero-${Date.now()}.jpg`
      
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(objectPath, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath)
      const newUrl = publicUrlData.publicUrl
      
      const { error: dbError } = await supabase.schema('app').from('service_images').upsert({
        service_key: contactImageKey,
        image_url: newUrl
      }, { onConflict: 'service_key' })
      
      if (dbError) throw dbError
      
      setImageUrl(newUrl)
      closeCropModal()
    } catch (err) {
      console.error('Error uploading image:', err)
      alert(`Could not upload image: ${err.message}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox' && name === 'newsletter') {
      setForm((f) => ({ ...f, newsletter: checked }))
    } else if (type === 'checkbox' && name === 'services') {
      setForm((f) => {
        const arr = f.services.includes(value) ? f.services.filter(s => s !== value) : [...f.services, value]
        return { ...f, services: arr }
      })
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('https://rhdgnxegrsdsrkrhqxey.supabase.co/functions/v1/dynamic-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setForm({ firstName: '', lastName: '', email: '', newsletter: false, phone: '', services: [], budget: '', howHeard: '', message: '' })
      } else {
        setError(data.error || 'Error sending message')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffdfa] text-[#1a1a1a] selection:bg-black selection:text-white flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1600px] px-6 sm:px-10 lg:px-16 pt-16 lg:pt-24 flex-1">
        
        <div className="grid gap-16 lg:grid-cols-[1fr_minmax(300px,420px)] lg:gap-20 items-start pb-24">
          
          <div className="flex flex-col">
            <h1 className="font-serif text-[4.5rem] sm:text-[6.5rem] leading-none tracking-tight text-black mb-6">Contact</h1>
            <hr className="mb-10 w-full border-t-[3px] border-black" />
            
            <div className="space-y-6 text-[15px] sm:text-[17px] leading-[1.8] text-[#1a1a1a] font-serif max-w-xl">
              <p>Have a question, an idea, or a wall that needs a story?</p>
              <p>Whether you’re interested in a custom painting, a mural, or want to explore a creative collaboration, feel free to reach out. Every project starts with a conversation. No pressure, no obligations, just possibilities.</p>
              <p>Fill in the form below or send me a message directly.</p>
              <div className="pb-8 mb-8 border-b border-black">
                <p>I respond as soon as possible. Let’s create something unforgettable!</p>
              </div>
            </div>

            <form className="grid gap-8 max-w-xl font-serif text-[#1a1a1a]" onSubmit={handleSubmit}>
              <div className="mb-2">
                <p className="text-lg">Name</p>
                <div className="grid gap-6 sm:grid-cols-2 mt-2">
                  <label className="grid gap-1 text-[14px]">
                    <span className="text-black/60">First Name <span className="text-black/40">(required)</span></span>
                    <input name="firstName" value={form.firstName} onChange={handleChange} required className="border-b border-black/40 bg-transparent px-2 py-3 hover:border-black/70 outline-none focus:border-black transition font-sans text-[15px] w-full" />
                  </label>
                  <label className="grid gap-1 text-[14px]">
                    <span className="text-black/60">Last Name <span className="text-black/40">(required)</span></span>
                    <input name="lastName" value={form.lastName} onChange={handleChange} required className="border-b border-black/40 bg-transparent px-2 py-3 hover:border-black/70 outline-none focus:border-black transition font-sans text-[15px] w-full" />
                  </label>
                </div>
              </div>

              <div>
                <label className="grid gap-1 text-[14px]">
                  <span className="text-black/60">Email <span className="text-black/40">(required)</span></span>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className="border-b border-black/40 bg-transparent px-2 py-3 hover:border-black/70 outline-none focus:border-black transition font-sans text-[15px] w-full" />
                </label>
                <label className="mt-4 flex items-center gap-3 text-[14px] text-black/70 cursor-pointer w-fit">
                  <input name="newsletter" type="checkbox" checked={form.newsletter} onChange={handleChange} className="h-4 w-4 rounded-sm border-black/40 cursor-pointer text-black" />
                  <span>Sign up for news and updates</span>
                </label>
              </div>

              <label className="grid gap-1 text-[14px]">
                <span className="text-black/60">Phone</span>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="border-b border-black/40 bg-transparent px-2 py-3 hover:border-black/70 outline-none focus:border-black transition font-sans text-[15px] w-full" />
              </label>

              <fieldset className="grid gap-2">
                <legend className="text-[15px] mb-2">What services are you interested in?</legend>
                <div className="flex flex-wrap gap-5 text-[14px] text-black/80">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input name="services" type="checkbox" value="Commission Art" checked={form.services.includes('Commission Art')} onChange={handleChange} className="h-4 w-4 rounded-sm border-black/40 cursor-pointer text-black" />
                    <span>Commission Art</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input name="services" type="checkbox" value="Mural Art" checked={form.services.includes('Mural Art')} onChange={handleChange} className="h-4 w-4 rounded-sm border-black/40 cursor-pointer text-black" />
                    <span>Mural Art</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input name="services" type="checkbox" value="Canvas Art" checked={form.services.includes('Canvas Art')} onChange={handleChange} className="h-4 w-4 rounded-sm border-black/40 cursor-pointer text-black" />
                    <span>Canvas Art</span>
                  </label>
                </div>
              </fieldset>

              <label className="grid gap-1 text-[14px]">
                <span className="text-black/60">How did you hear about me?</span>
                <div className="relative">
                  <select name="howHeard" value={form.howHeard} onChange={handleChange} className="w-full border-b border-black/40 bg-transparent px-2 py-3 hover:border-black/70 outline-none focus:border-black transition font-sans text-[15px] appearance-none cursor-pointer">
                    <option value="">Select an option</option>
                    <option value="instagram">Instagram</option>
                    <option value="google">Google</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg className="h-4 w-4 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </label>

              <label className="grid gap-1 text-[14px]">
                <span className="text-black/60">Message <span className="text-black/40">(required)</span></span>
                <textarea name="message" rows={5} value={form.message} onChange={handleChange} required className="border border-black/40 bg-transparent px-4 py-4 mt-2 hover:border-black/70 outline-none focus:border-black transition resize-none font-sans text-[15px]" />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 inline-flex w-fit items-center justify-center bg-black px-12 py-3.5 text-[14px] text-white transition hover:bg-black/80 disabled:opacity-60 font-sans tracking-widest uppercase"
              >
                {loading ? 'Sending...' : 'Submit'}
              </button>
              
              {success && <p className="text-green-700 font-sans mt-2 text-sm">Message sent! We will contact you soon.</p>}
              {error && <p className="text-red-700 font-sans mt-2 text-sm">{error}</p>}
            </form>
          </div>

          <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 mt-10 lg:mt-0 overflow-hidden bg-black/5 aspect-[4/5] object-cover group">
            <div className="w-full h-full relative">
              {imageUrl ? (
                <img src={imageUrl} alt="Contact Madebyvic" className="h-full w-full object-cover object-center transition-all duration-700 hover:scale-[1.02]" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-black/10">
                  <p className="text-xs font-sans uppercase tracking-[0.2em] text-black/40">NO IMAGE</p>
                </div>
              )}
            </div>

            {isAdmin && (
              <label 
                className="absolute right-4 top-4 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/30 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80 backdrop-blur-sm"
                title="Edit Image"
              >
                <FiEdit2 size={16} />
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageFileChange} disabled={uploadingImage} />
              </label>
            )}
          </div>

        </div>
      </main>
      
      <SiteFooter />

      {showCropModal && pendingPreviewUrl
        ? createPortal(
            <div
              className="fixed inset-x-0 bottom-0 top-[73px] z-[125] bg-black/80 p-4 backdrop-blur-sm sm:p-6"
              onClick={closeCropModal}
            >
              <div
                className="mx-auto flex h-full w-full max-w-4xl flex-col rounded-sm border border-white/20 bg-black/90 p-4 sm:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <p className="display-font text-sm uppercase tracking-[0.2em] text-white">Contact Page Image</p>
                    <p className="mt-1 text-xs text-white/60">
                      Drag and zoom to format. The illuminated area is exactly what will show on the right column (4:5 format).
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                    onClick={closeCropModal}
                    title="Cancel"
                  >
                    <FiX size={16} />
                  </button>
                </div>
                
                <div className="relative flex-1 bg-black/95">
                  <Cropper
                    image={pendingPreviewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={4 / 5}
                    onCropChange={setCrop}
                    onCropComplete={handleCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>

                <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex w-full items-center gap-4 sm:w-1/2">
                    <label htmlFor="service-zoom-slider" className="display-font text-[10px] tracking-[0.2em] text-white/60">
                      ZOOM
                    </label>
                    <input
                      id="service-zoom-slider"
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="range-sm flex-1"
                    />
                  </div>
                  <div className="flex w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={uploadingImage}
                      className="inline-flex w-full items-center justify-center rounded-sm border border-white/20 bg-white px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white/80 disabled:opacity-50 sm:w-auto"
                      onClick={handleConfirmUpload}
                    >
                      {uploadingImage ? 'UPLOADING...' : 'SAVE IMAGE'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

    </div>
  )
}

export default ContactPage
