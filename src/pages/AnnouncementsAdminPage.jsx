import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FiCheckCircle, FiEdit2, FiImage, FiMail, FiPlus, FiSend, FiTrash2 } from 'react-icons/fi'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../context/AuthContext'
import { supabase, supabaseReady } from '../lib/supabase'

const emptyForm = {
  id: null,
  message: '',
  isActive: true,
}

const profilesPageSize = 10

const emptyProfileEdit = {
  id: '',
  fullName: '',
  phone: '',
  isAdmin: false,
}

const maxNewsletterImageBytes = 8 * 1024 * 1024
const maxNewsletterImageCount = 5

const sanitizeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildNewsletterHtml = (subject, bodyText, imageUrls) => {
  const formattedBody = sanitizeHtml(bodyText).replace(/\n/g, '<br />')
  const imageBlocks = imageUrls
    .map(
      (url) =>
        `<div style="margin-top:18px;"><img src="${sanitizeHtml(url)}" alt="Newsletter image" style="width:100%;max-width:680px;border-radius:10px;display:block;" /></div>`,
    )
    .join('')

  return `
    <div style="background:#080808;padding:28px 16px;font-family:Arial,sans-serif;color:#f5f5f5;">
      <div style="max-width:700px;margin:0 auto;border:1px solid rgba(255,255,255,0.18);background:#101010;padding:24px;border-radius:14px;">
        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:#bdbdbd;">Madebyvic Update</p>
        <h1 style="margin:0 0 14px 0;font-size:28px;line-height:1.15;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;">${sanitizeHtml(subject)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#e8e8e8;">${formattedBody}</p>
        ${imageBlocks}
        <p style="margin:22px 0 0 0;font-size:12px;color:#9b9b9b;">You are receiving this email because you subscribed on madebyvic.com.</p>
      </div>
    </div>
  `
}

function AnnouncementsAdminPage() {
  const { user, profile, loading, seeAsAdmin, setSeeAsAdmin } = useAuth()
  const isAdmin = profile?.is_admin === true
  const waitingForProfile = loading || (Boolean(user) && !profile)

  const [announcements, setAnnouncements] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [profiles, setProfiles] = useState([])
  const [profilesPage, setProfilesPage] = useState(1)
  const [profilesTotalCount, setProfilesTotalCount] = useState(0)
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesSaving, setProfilesSaving] = useState(false)
  const [profilesError, setProfilesError] = useState('')
  const [profilesMessage, setProfilesMessage] = useState('')
  const [editingProfileId, setEditingProfileId] = useState('')
  const [profileEdit, setProfileEdit] = useState(emptyProfileEdit)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [subscribersLoading, setSubscribersLoading] = useState(true)
  const [newsletterSubject, setNewsletterSubject] = useState('')
  const [newsletterPreheader, setNewsletterPreheader] = useState('')
  const [newsletterBody, setNewsletterBody] = useState('')
  const [newsletterImageFiles, setNewsletterImageFiles] = useState([])
  const [newsletterSending, setNewsletterSending] = useState(false)
  const [newsletterError, setNewsletterError] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')

  const profilesTotalPages = useMemo(
    () => Math.max(1, Math.ceil((profilesTotalCount || 0) / profilesPageSize)),
    [profilesTotalCount],
  )

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const clearProfilesFeedback = () => {
    setProfilesError('')
    setProfilesMessage('')
  }

  const clearNewsletterFeedback = () => {
    setNewsletterError('')
    setNewsletterMessage('')
  }

  const loadAnnouncements = async () => {
    if (!supabaseReady || !supabase) {
      setError('Service is temporarily unavailable.')
      setPageLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .schema('app')
      .from('site_announcements')
      .select('id, message, is_active, created_at, updated_at')
      .order('updated_at', { ascending: false })

    if (queryError) {
      setError(queryError.message || 'Could not load announcements.')
      setPageLoading(false)
      return
    }

    setAnnouncements(Array.isArray(data) ? data : [])
    setPageLoading(false)
  }

  const loadProfiles = async (page = profilesPage) => {
    if (!supabaseReady || !supabase) {
      setProfilesError('Service is temporarily unavailable.')
      setProfilesLoading(false)
      return
    }

    setProfilesLoading(true)

    const from = (page - 1) * profilesPageSize
    const to = from + profilesPageSize - 1

    const { data, error: queryError, count } = await supabase
      .schema('app')
      .from('profiles')
      .select('id, email, full_name, phone, is_admin, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (queryError) {
      setProfilesError(queryError.message || 'Could not load profiles.')
      setProfilesLoading(false)
      return
    }

    setProfiles(Array.isArray(data) ? data : [])
    setProfilesTotalCount(Number(count || 0))
    setProfilesLoading(false)
  }

  const loadSubscriberCount = async () => {
    if (!supabaseReady || !supabase) {
      setSubscribersLoading(false)
      return
    }

    setSubscribersLoading(true)

    const { count, error: countError } = await supabase
      .schema('app')
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    if (countError) {
      setNewsletterError(
        countError.message?.toLowerCase().includes('does not exist')
          ? 'Missing table app.newsletter_subscribers. Run the SQL setup first.'
          : countError.message || 'Could not load subscriber count.',
      )
      setSubscribersLoading(false)
      return
    }

    setSubscriberCount(Number(count || 0))
    setSubscribersLoading(false)
  }

  useEffect(() => {
    if (!loading && isAdmin) {
      loadAnnouncements()
    }
  }, [loading, isAdmin])

  useEffect(() => {
    if (!loading && isAdmin) {
      loadProfiles(profilesPage)
    }
  }, [loading, isAdmin, profilesPage])

  useEffect(() => {
    if (!loading && isAdmin) {
      loadSubscriberCount()
    }
  }, [loading, isAdmin])

  const resetForm = () => {
    setForm(emptyForm)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError('Service is temporarily unavailable.')
      return
    }

    const nextMessage = form.message.trim()
    if (!nextMessage) {
      setError('Please enter announcement text.')
      return
    }

    setSaving(true)

    const payload = {
      message: nextMessage,
      is_active: form.isActive,
    }

    const { error: saveError } = form.id
      ? await supabase
          .schema('app')
          .from('site_announcements')
          .update(payload)
          .eq('id', form.id)
      : await supabase.schema('app').from('site_announcements').insert(payload)

    if (saveError) {
      const missingTable = saveError.message?.toLowerCase().includes('does not exist')
      setError(
        missingTable
          ? 'Missing table app.site_announcements in Supabase. Run the SQL script first.'
          : saveError.message || 'Could not save announcement.',
      )
      setSaving(false)
      return
    }

    await loadAnnouncements()
    setMessage(form.id ? 'Announcement updated.' : 'Announcement created.')
    resetForm()
    setSaving(false)
  }

  const handleEdit = (item) => {
    clearFeedback()
    setForm({
      id: item.id,
      message: item.message,
      isActive: item.is_active,
    })
  }

  const handleDelete = async (itemId) => {
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError('Service is temporarily unavailable.')
      return
    }

    setSaving(true)
    const { error: deleteError } = await supabase.schema('app').from('site_announcements').delete().eq('id', itemId)

    if (deleteError) {
      setError(deleteError.message || 'Could not delete announcement.')
      setSaving(false)
      return
    }

    if (form.id === itemId) {
      resetForm()
    }

    await loadAnnouncements()
    setMessage('Announcement deleted.')
    setSaving(false)
  }

  const handleToggleActive = async (item) => {
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError('Service is temporarily unavailable.')
      return
    }

    setSaving(true)

    if (item.is_active) {
      const { error: deactivateError } = await supabase
        .schema('app')
        .from('site_announcements')
        .update({ is_active: false })
        .eq('id', item.id)

      if (deactivateError) {
        setError(deactivateError.message || 'Could not deactivate announcement.')
        setSaving(false)
        return
      }

      await loadAnnouncements()
      setMessage('Announcement deactivated.')
      setSaving(false)
      return
    }

    const { error: activateError } = await supabase
      .schema('app')
      .from('site_announcements')
      .update({ is_active: true })
      .eq('id', item.id)

    if (activateError) {
      setError(activateError.message || 'Could not activate announcement.')
      setSaving(false)
      return
    }

    await loadAnnouncements()
    setMessage('Announcement activated.')
    setSaving(false)
  }

  const startProfileEdit = (item) => {
    clearProfilesFeedback()
    setEditingProfileId(String(item.id))
    setProfileEdit({
      id: String(item.id),
      fullName: item.full_name || '',
      phone: item.phone || '',
      isAdmin: item.is_admin === true,
    })
  }

  const cancelProfileEdit = () => {
    setEditingProfileId('')
    setProfileEdit(emptyProfileEdit)
  }

  const handleSaveProfile = async () => {
    clearProfilesFeedback()

    if (!supabaseReady || !supabase) {
      setProfilesError('Service is temporarily unavailable.')
      return
    }

    if (!editingProfileId) {
      setProfilesError('Select a profile to edit.')
      return
    }

    setProfilesSaving(true)

    const { error: updateError } = await supabase
      .schema('app')
      .from('profiles')
      .update({
        full_name: profileEdit.fullName.trim() || null,
        phone: profileEdit.phone.trim() || null,
        is_admin: profileEdit.isAdmin,
      })
      .eq('id', editingProfileId)

    if (updateError) {
      setProfilesError(updateError.message || 'Could not update profile.')
      setProfilesSaving(false)
      return
    }

    await loadProfiles(profilesPage)
    setProfilesMessage('Profile updated.')
    setProfilesSaving(false)
    cancelProfileEdit()
  }

  const handleDeleteProfile = async (profileId) => {
    clearProfilesFeedback()

    if (!supabaseReady || !supabase) {
      setProfilesError('Service is temporarily unavailable.')
      return
    }

    setProfilesSaving(true)

    const { error: deleteError } = await supabase
      .schema('app')
      .from('profiles')
      .delete()
      .eq('id', profileId)

    if (deleteError) {
      setProfilesError(deleteError.message || 'Could not delete profile.')
      setProfilesSaving(false)
      return
    }

    const nextCount = Math.max(0, profilesTotalCount - 1)
    const maxPageAfterDelete = Math.max(1, Math.ceil(nextCount / profilesPageSize))
    const nextPage = Math.min(profilesPage, maxPageAfterDelete)

    if (nextPage !== profilesPage) {
      setProfilesPage(nextPage)
    } else {
      await loadProfiles(nextPage)
    }

    setProfilesMessage('Profile deleted.')
    setProfilesSaving(false)

    if (editingProfileId === String(profileId)) {
      cancelProfileEdit()
    }
  }

  const handleNewsletterImageSelect = (event) => {
    clearNewsletterFeedback()
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    const tooMany = files.length > maxNewsletterImageCount
    const invalidType = files.some((file) => !String(file.type || '').startsWith('image/'))
    const tooLarge = files.some((file) => file.size > maxNewsletterImageBytes)

    if (tooMany) {
      setNewsletterError(`You can attach up to ${maxNewsletterImageCount} images.`)
      event.target.value = ''
      return
    }

    if (invalidType) {
      setNewsletterError('Only image files are allowed.')
      event.target.value = ''
      return
    }

    if (tooLarge) {
      setNewsletterError('Each image must be 8MB or smaller.')
      event.target.value = ''
      return
    }

    setNewsletterImageFiles(files)
    event.target.value = ''
  }

  const uploadNewsletterImages = async (files) => {
    const urls = []

    for (const file of files) {
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase() : 'jpg'
      const safeExt = extension.replace(/[^a-z0-9]/g, '') || 'jpg'
      const objectPath = `campaigns/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`

      const { error: uploadError } = await supabase.storage.from('newsletter-assets').upload(objectPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })

      if (uploadError) {
        throw new Error(uploadError.message || 'Could not upload one of the selected images.')
      }

      const { data: publicUrlData } = supabase.storage.from('newsletter-assets').getPublicUrl(objectPath)
      if (!publicUrlData?.publicUrl) {
        throw new Error('Could not generate public URL for an uploaded image.')
      }

      urls.push(publicUrlData.publicUrl)
    }

    return urls
  }

  const handleSendNewsletter = async (event) => {
    event.preventDefault()
    clearNewsletterFeedback()

    if (!supabaseReady || !supabase) {
      setNewsletterError('Service is temporarily unavailable.')
      return
    }

    const subject = newsletterSubject.trim()
    const preheader = newsletterPreheader.trim()
    const body = newsletterBody.trim()

    if (!subject) {
      setNewsletterError('Please add an email subject.')
      return
    }

    if (!body) {
      setNewsletterError('Please add the newsletter message body.')
      return
    }

    if (subscriberCount === 0) {
      setNewsletterError('There are no active subscribers yet.')
      return
    }

    setNewsletterSending(true)

    try {
      const imageUrls = newsletterImageFiles.length > 0 ? await uploadNewsletterImages(newsletterImageFiles) : []
      const html = buildNewsletterHtml(subject, body, imageUrls)

      const { data, error: invokeError } = await supabase.functions.invoke('send-subscriber-broadcast', {
        body: {
          subject,
          preheader,
          bodyText: body,
          html,
          imageUrls,
        },
      })

      if (invokeError) {
        throw new Error(
          invokeError.message?.toLowerCase().includes('not found')
            ? 'Missing function send-subscriber-broadcast. Deploy the Edge Function first.'
            : invokeError.message || 'Could not trigger newsletter sending.',
        )
      }

      const sentCount = Number(data?.sentCount || 0)
      setNewsletterMessage(
        sentCount > 0
          ? `Newsletter sent to ${sentCount} subscriber${sentCount === 1 ? '' : 's'}.`
          : 'Newsletter request queued. Check function logs for delivery details.',
      )
      setNewsletterSubject('')
      setNewsletterPreheader('')
      setNewsletterBody('')
      setNewsletterImageFiles([])
      await loadSubscriberCount()
    } catch (sendError) {
      setNewsletterError(sendError?.message || 'Could not send newsletter.')
    } finally {
      setNewsletterSending(false)
    }
  }

  if (!waitingForProfile && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col touch-pan-y">
      <SiteHeader forceShowMenuButton />
      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-5 py-12 sm:px-7 lg:px-10 flex-1">
        <section className="mb-8 rounded-sm border border-white/15 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="display-font text-xs tracking-[0.24em] text-white/60">ADMIN VIEW MODE</p>
              <p className="mt-2 text-sm text-white/75">
                Keep admin access enabled, but hide all edit controls from the public pages.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3 rounded-sm border border-white/20 bg-black/45 px-4 py-3 text-sm text-white/90">
              <input
                type="checkbox"
                checked={seeAsAdmin}
                onChange={(event) => setSeeAsAdmin(event.target.checked)}
                className="h-4 w-4 rounded-sm border-white/25 bg-black text-white"
              />
              <span className="uppercase tracking-[0.14em]">See as admin</span>
            </label>
          </div>
        </section>

        <section className="rounded-sm border border-white/15 bg-white/[0.02] p-6 sm:p-8 overflow-x-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="display-font text-xs tracking-[0.3em] text-white/55">ADMIN ONLY</p>
              <h1 className="display-font mt-2 text-3xl uppercase tracking-[0.06em] sm:text-4xl">Home Announcements</h1>
              <p className="mt-3 max-w-3xl text-sm text-white/70">
                Create, edit, and delete the announcement that appears above the home header.
              </p>
            </div>
            <button
              type="button"
              className="action-btn action-btn-outline"
              onClick={resetForm}
              disabled={saving}
            >
              <FiPlus size={14} />
              New Announcement
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
          {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}

          <form className="mt-6 grid gap-4" onSubmit={handleSave}>
            <label className="field-wrap">
              <span>Announcement text</span>
              <textarea
                rows={3}
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Get 20% off your first mural. Limited-time offer."
              />
            </label>

            <label className="inline-flex w-fit cursor-pointer items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="h-4 w-4 rounded-sm border-white/25 bg-black text-white"
              />
              Mark as active announcement
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="action-btn action-btn-solid"
                disabled={saving}
              >
                {saving ? 'Saving...' : form.id ? 'Update Announcement' : 'Create Announcement'}
              </button>
              {form.id ? (
                <button
                  type="button"
                  className="action-btn action-btn-outline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h2 className="display-font text-xs tracking-[0.24em] text-white/60">Saved Announcements</h2>

            {pageLoading ? <p className="mt-4 text-sm text-white/60">Loading announcements...</p> : null}

            {!pageLoading && announcements.length === 0 ? (
              <p className="mt-4 text-sm text-white/55">No announcements yet.</p>
            ) : null}

            <div className="mt-4 grid gap-3">
              {announcements.map((item) => (
                <article key={item.id} className="rounded-sm border border-white/15 bg-black/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/90">{item.message}</p>
                      <p className="mt-2 text-xs tracking-[0.16em] text-white/45 uppercase">
                        ID {item.id} {item.is_active ? '• ACTIVE' : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                        onClick={() => handleEdit(item)}
                        title="Edit"
                        disabled={saving}
                      >
                        <FiEdit2 size={15} />
                      </button>

                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-red-300/35 bg-red-900/20 text-red-200 transition hover:border-red-200/80 hover:bg-red-900/40"
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                        disabled={saving}
                      >
                        <FiTrash2 size={15} />
                      </button>

                      <button
                        type="button"
                        className={`inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 text-xs uppercase tracking-[0.14em] transition ${
                          item.is_active
                            ? 'border border-amber-300/35 bg-amber-900/20 text-amber-200 hover:border-amber-200/80 hover:bg-amber-900/40'
                            : 'border border-emerald-300/35 bg-emerald-900/20 text-emerald-200 hover:border-emerald-200/80 hover:bg-emerald-900/40'
                        }`}
                        onClick={() => handleToggleActive(item)}
                        disabled={saving}
                      >
                        <FiCheckCircle size={14} />
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-sm border border-white/15 bg-white/[0.02] p-6 sm:p-8 overflow-x-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="display-font text-xs tracking-[0.3em] text-white/55">ADMIN ONLY</p>
              <h2 className="display-font mt-2 text-3xl uppercase tracking-[0.06em] sm:text-4xl">Subscribers Broadcast</h2>
              <p className="mt-3 max-w-3xl text-sm text-white/70">
                Write one email and send it to all active subscribers. You can attach up to 5 images.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-sm border border-white/20 bg-black/45 px-4 py-3 text-sm text-white/85">
              <FiMail size={15} />
              {subscribersLoading ? 'Loading subscribers...' : `${subscriberCount} active subscriber${subscriberCount === 1 ? '' : 's'}`}
            </div>
          </div>

          {newsletterError ? <p className="mt-4 text-sm text-red-300">{newsletterError}</p> : null}
          {newsletterMessage ? <p className="mt-4 text-sm text-emerald-300">{newsletterMessage}</p> : null}

          <form className="mt-6 grid gap-4" onSubmit={handleSendNewsletter}>
            <label className="field-wrap">
              <span>Email subject</span>
              <input
                value={newsletterSubject}
                onChange={(event) => setNewsletterSubject(event.target.value)}
                placeholder="New mural release this Friday"
              />
            </label>

            <label className="field-wrap">
              <span>Preheader (optional)</span>
              <input
                value={newsletterPreheader}
                onChange={(event) => setNewsletterPreheader(event.target.value)}
                placeholder="Early access for subscribers only."
              />
            </label>

            <label className="field-wrap">
              <span>Message body</span>
              <textarea
                rows={8}
                value={newsletterBody}
                onChange={(event) => setNewsletterBody(event.target.value)}
                placeholder="Hey, private list. New originals just dropped..."
              />
            </label>

            <label className="field-wrap">
              <span>Attach images</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="action-btn action-btn-outline cursor-pointer">
                  <FiImage size={14} />
                  Select Images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleNewsletterImageSelect}
                  />
                </label>
                <p className="text-xs text-white/60">Max {maxNewsletterImageCount} images, 8MB each.</p>
              </div>

              {newsletterImageFiles.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm text-white/75">
                  {newsletterImageFiles.map((file) => (
                    <li key={`${file.name}-${file.size}`} className="rounded-sm border border-white/10 bg-black/30 px-3 py-2">
                      {file.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="action-btn action-btn-solid" disabled={newsletterSending || subscribersLoading}>
                <FiSend size={14} />
                {newsletterSending ? 'Sending...' : 'Send To All Subscribers'}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-sm border border-white/15 bg-white/[0.02] p-6 sm:p-8 overflow-x-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="display-font text-xs tracking-[0.3em] text-white/55">ADMIN ONLY</p>
              <h2 className="display-font mt-2 text-3xl uppercase tracking-[0.06em] sm:text-4xl">Profiles Manager</h2>
              <p className="mt-3 max-w-3xl text-sm text-white/70">
                View, edit, and delete profiles. This section shows 10 users per page.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-sm border border-white/25 bg-black/55 px-4 text-xs uppercase tracking-[0.14em] text-white transition hover:border-white/70 hover:bg-black/80 disabled:opacity-45"
                onClick={() => setProfilesPage((prev) => Math.max(1, prev - 1))}
                disabled={profilesPage <= 1 || profilesLoading || profilesSaving}
              >
                Previous
              </button>
              <span className="min-w-[120px] text-center text-xs uppercase tracking-[0.14em] text-white/60">
                Page {profilesPage} / {profilesTotalPages}
              </span>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-sm border border-white/25 bg-black/55 px-4 text-xs uppercase tracking-[0.14em] text-white transition hover:border-white/70 hover:bg-black/80 disabled:opacity-45"
                onClick={() => setProfilesPage((prev) => Math.min(profilesTotalPages, prev + 1))}
                disabled={profilesPage >= profilesTotalPages || profilesLoading || profilesSaving}
              >
                Next
              </button>
            </div>
          </div>

          {profilesError ? <p className="mt-4 text-sm text-red-300">{profilesError}</p> : null}
          {profilesMessage ? <p className="mt-4 text-sm text-emerald-300">{profilesMessage}</p> : null}

          {profilesLoading ? <p className="mt-4 text-sm text-white/60">Loading profiles...</p> : null}

          {!profilesLoading && profiles.length === 0 ? <p className="mt-4 text-sm text-white/55">No profiles found.</p> : null}

          <div className="mt-5 overflow-x-auto rounded-sm border border-white/10">
            <div className="hidden grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-white/60 md:grid">
              <span>Email</span>
              <span>Full Name</span>
              <span>Phone</span>
              <span>Role</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-white/10">
              {profiles.map((item) => {
                const isEditing = editingProfileId === String(item.id)

                return (
                  <article key={item.id} className="bg-black/35 px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr] md:items-center">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 md:hidden">Email</p>
                        <p className="break-all text-sm text-white/85">{item.email || 'No email'}</p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 md:hidden">Full Name</p>
                        {isEditing ? (
                          <input
                            value={profileEdit.fullName}
                            onChange={(event) => setProfileEdit((prev) => ({ ...prev, fullName: event.target.value }))}
                            className="w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/60"
                          />
                        ) : (
                          <p className="text-sm text-white/85">{item.full_name || '-'}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 md:hidden">Phone</p>
                        {isEditing ? (
                          <input
                            value={profileEdit.phone}
                            onChange={(event) => setProfileEdit((prev) => ({ ...prev, phone: event.target.value }))}
                            className="w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/60"
                          />
                        ) : (
                          <p className="text-sm text-white/85">{item.phone || '-'}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45 md:hidden">Role</p>
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={profileEdit.isAdmin}
                              onChange={(event) => setProfileEdit((prev) => ({ ...prev, isAdmin: event.target.checked }))}
                              className="h-4 w-4 rounded-sm border-white/30 bg-black"
                            />
                            Admin
                          </label>
                        ) : (
                          <span
                            className={`inline-flex rounded-sm border px-2 py-1 text-[11px] uppercase tracking-[0.12em] ${
                              item.is_admin
                                ? 'border-emerald-300/40 bg-emerald-900/20 text-emerald-200'
                                : 'border-white/25 bg-white/[0.02] text-white/65'
                            }`}
                          >
                            {item.is_admin ? 'Admin' : 'User'}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-start gap-2 md:justify-end">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-sm border border-emerald-300/35 bg-emerald-900/20 px-3 text-xs uppercase tracking-[0.14em] text-emerald-200 transition hover:border-emerald-200/80 hover:bg-emerald-900/40"
                              onClick={handleSaveProfile}
                              disabled={profilesSaving}
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 px-3 text-xs uppercase tracking-[0.14em] text-white transition hover:border-white/70 hover:bg-black/80"
                              onClick={cancelProfileEdit}
                              disabled={profilesSaving}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-black/55 text-white transition hover:border-white/70 hover:bg-black/80"
                              onClick={() => startProfileEdit(item)}
                              title="Edit profile"
                              disabled={profilesSaving}
                            >
                              <FiEdit2 size={15} />
                            </button>

                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-red-300/35 bg-red-900/20 text-red-200 transition hover:border-red-200/80 hover:bg-red-900/40"
                              onClick={() => handleDeleteProfile(item.id)}
                              title="Delete profile"
                              disabled={profilesSaving}
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default AnnouncementsAdminPage
