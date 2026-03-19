import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { FiEdit2, FiPlus } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { supabase, supabaseReady } from '../lib/supabase'

const emptyAddressForm = {
  addressType: 'shipping',
  fullName: '',
  company: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateCode: '',
  postalCode: '',
  deliveryInstructions: '',
  isDefault: true,
}

const usStatesFallback = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
]

function CustomSelect({ label, value, onChange, options, placeholder = 'Select option' }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((option) => option.value === value)

  return (
    <div className="custom-select" ref={wrapperRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span className={`custom-select-caret ${open ? 'is-open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="custom-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`custom-select-option ${option.value === value ? 'is-selected' : ''}`}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProfilePage() {
  const addressFormRef = useRef(null)
  const { user, profile, loading, refreshProfile, signOut } = useAuth()
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressId, setAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(emptyAddressForm)
  const [states, setStates] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
    })
  }, [profile])

  useEffect(() => {
    if (!user || !supabaseReady || !supabase) {
      return
    }

    const loadAddressData = async () => {
      setLoadingAddress(true)

      const [statesResponse, addressResponse] = await Promise.all([
        supabase.schema('app').from('us_states').select('code, name').order('name', { ascending: true }),
        supabase
          .schema('app')
          .from('addresses')
          .select(
            'id, address_type, full_name, company, phone, address_line1, address_line2, city, state_code, postal_code, delivery_instructions, is_default',
          )
          .eq('profile_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (!statesResponse.error && (statesResponse.data?.length ?? 0) > 0) {
        setStates(statesResponse.data)
      } else {
        setStates(usStatesFallback)
      }

      if (addressResponse.error) {
        setAddressId(null)
        setAddressForm((prev) => ({
          ...prev,
          fullName: form.fullName || user.user_metadata?.full_name || '',
          phone: form.phone || user.user_metadata?.phone || '',
        }))
        setEditingAddress(false)
        setLoadingAddress(false)
        return
      }

      if (!addressResponse.data) {
        setAddressId(null)
        setAddressForm((prev) => ({
          ...prev,
          fullName: form.fullName || user.user_metadata?.full_name || '',
          phone: form.phone || user.user_metadata?.phone || '',
        }))
        setEditingAddress(false)
        setLoadingAddress(false)
        return
      }

      const row = addressResponse.data

      setAddressId(row.id)
      setAddressForm({
        addressType: row.address_type,
        fullName: row.full_name,
        company: row.company || '',
        phone: row.phone || '',
        addressLine1: row.address_line1,
        addressLine2: row.address_line2 || '',
        city: row.city,
        stateCode: row.state_code,
        postalCode: row.postal_code,
        deliveryInstructions: row.delivery_instructions || '',
        isDefault: row.is_default,
      })
      setEditingAddress(false)
      setLoadingAddress(false)
    }

    loadAddressData()
  }, [user, supabaseReady, supabase])

  useEffect(() => {
    if (!editingAddress || !addressFormRef.current) {
      return
    }

    const timeout = window.setTimeout(() => {
      addressFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)

    return () => window.clearTimeout(timeout)
  }, [editingAddress])

  if (loading) {
    return (
      <main className="auth-shell">
        <div className="auth-background" aria-hidden="true" />
        <section className="auth-card">
          <h1 className="display-font auth-title">Loading...</h1>
        </section>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  const clearFeedback = () => {
    setError('')
    setMessage('')
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddressChange = (event) => {
    const { name, value, type, checked } = event.target
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError('Supabase is not configured.')
      return
    }

    setSavingProfile(true)

    const { error: updateError } = await supabase
      .schema('app')
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: form.fullName || null,
          phone: form.phone || null,
        },
        { onConflict: 'id' },
      )

    if (updateError) {
      const permissionDenied =
        updateError.message.toLowerCase().includes('permission denied for schema app') ||
        updateError.message.toLowerCase().includes('invalid schema: app')

      if (!permissionDenied) {
        setError(updateError.message)
        setSavingProfile(false)
        return
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: form.fullName || null,
          phone: form.phone || null,
        },
      })

      if (metadataError) {
        setError(metadataError.message)
        setSavingProfile(false)
        return
      }

      await refreshProfile()
      setMessage('Profile updated in account metadata. Enable schema permissions to sync app.profiles.')
      setSavingProfile(false)
      return
    }

    await refreshProfile()
    setMessage('Profile updated successfully.')
    setSavingProfile(false)
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError('Supabase is not configured.')
      return
    }

    if (!passwordForm.currentPassword) {
      setError('Please enter your current password.')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must contain at least 6 characters.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSavingPassword(true)

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordForm.currentPassword,
    })

    if (verifyError) {
      setError('Current password is incorrect.')
      setSavingPassword(false)
      return
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    })

    if (passwordError) {
      setError(passwordError.message)
      setSavingPassword(false)
      return
    }

    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setMessage('Password updated successfully.')
    setShowPasswordForm(false)
    setSavingPassword(false)
  }

  const handleSignOut = async () => {
    clearFeedback()
    await signOut()
  }

  const handleSaveAddress = async (event) => {
    event.preventDefault()
    clearFeedback()

    if (!supabaseReady || !supabase) {
      setError('Supabase is not configured.')
      return
    }

    if (!addressForm.fullName || !addressForm.addressLine1 || !addressForm.city || !addressForm.stateCode || !addressForm.postalCode) {
      setError('Please complete all required address fields.')
      return
    }

    const validPostal = /^[0-9]{5}(-[0-9]{4})?$/.test(addressForm.postalCode)
    if (!validPostal) {
      setError('Postal code must be in US format: 12345 or 12345-6789.')
      return
    }

    setSavingAddress(true)

    const payload = {
      profile_id: user.id,
      address_type: addressForm.addressType,
      full_name: addressForm.fullName,
      company: addressForm.company || null,
      phone: addressForm.phone || null,
      address_line1: addressForm.addressLine1,
      address_line2: addressForm.addressLine2 || null,
      city: addressForm.city,
      state_code: addressForm.stateCode,
      postal_code: addressForm.postalCode,
      country_code: 'US',
      delivery_instructions: addressForm.deliveryInstructions || null,
      is_default: addressForm.isDefault,
    }

    const query = addressId
      ? supabase.schema('app').from('addresses').update(payload).eq('id', addressId).eq('profile_id', user.id)
      : supabase.schema('app').from('addresses').insert(payload).select('id').single()

    const { data, error: addressError } = await query

    if (addressError) {
      setError(addressError.message)
      setSavingAddress(false)
      return
    }

    if (!addressId && data?.id) {
      setAddressId(data.id)
    }

    setEditingAddress(false)
    setMessage(addressId ? 'Address updated successfully.' : 'Address created successfully.')
    setSavingAddress(false)
  }

  const profileName = (profile?.full_name || user.user_metadata?.full_name || 'Profile').trim()
  const firstName = profileName.split(/\s+/)[0]
  const initials = firstName.slice(0, 1).toUpperCase()
  const stateOptions = states.map((state) => ({ value: state.code, label: state.name }))
  const addressTypeOptions = [
    { value: 'shipping', label: 'Shipping' },
    { value: 'billing', label: 'Billing' },
    { value: 'both', label: 'Both' },
  ]

  return (
    <main className="auth-shell">
      <div className="auth-background" aria-hidden="true" />

      <section className="auth-card profile-card">
        <div className="auth-topbar">
          <div className="auth-topbar-actions">
            <Link to="/" className="story-link auth-back-link">
              Back to home
            </Link>
            <button type="button" className="action-btn action-btn-outline profile-top-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <p className="display-font auth-brand">MY PROFILE</p>
        </div>

        <div className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>
          <div>
            <h1 className="display-font auth-title">{firstName}</h1>
            <p className="auth-subtitle">Manage your account details and security settings.</p>
          </div>
        </div>

        <div className="profile-grid">
          <article className="profile-panel">
            <h2 className="display-font profile-panel-title">Profile Details</h2>
            <form className="auth-form" onSubmit={handleSaveProfile}>
              <label className="field-wrap">
                <span>Email</span>
                <input className="auth-input" value={user.email ?? ''} disabled readOnly />
              </label>

              <label className="field-wrap">
                <span>Full Name</span>
                <input
                  className="auth-input"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleProfileChange}
                  placeholder="Your full name"
                />
              </label>

              <label className="field-wrap">
                <span>Phone</span>
                <input
                  className="auth-input"
                  name="phone"
                  value={form.phone}
                  onChange={handleProfileChange}
                  placeholder="Your phone"
                />
              </label>

              <button type="submit" className="action-btn action-btn-solid auth-submit" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save profile'}
              </button>
            </form>
          </article>

          <div className="profile-right-stack">
            <article className="profile-panel">
              <h2 className="display-font profile-panel-title">Security</h2>
              {!showPasswordForm ? (
                <div className="profile-password-cta">
                  <p>If you want to change your password, start a secure verification first.</p>
                  <button
                    type="button"
                    className="action-btn action-btn-outline"
                    onClick={() => {
                      clearFeedback()
                      setShowPasswordForm(true)
                    }}
                  >
                    I want to change my password
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleChangePassword}>
                  <label className="field-wrap">
                    <span>Current Password</span>
                    <input
                      className="auth-input"
                      type="password"
                      name="currentPassword"
                      minLength={6}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Enter your current password"
                    />
                  </label>

                  <label className="field-wrap">
                    <span>New Password</span>
                    <input
                      className="auth-input"
                      type="password"
                      name="newPassword"
                      minLength={6}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Minimum 6 characters"
                    />
                  </label>

                  <label className="field-wrap">
                    <span>Confirm New Password</span>
                    <input
                      className="auth-input"
                      type="password"
                      name="confirmPassword"
                      minLength={6}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Repeat new password"
                    />
                  </label>

                  <div className="profile-password-actions">
                    <button
                      type="button"
                      className="action-btn action-btn-outline"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                        clearFeedback()
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="action-btn action-btn-solid" disabled={savingPassword}>
                      {savingPassword ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </form>
              )}
            </article>

            <article className="profile-panel profile-address-compact">
              <div className="profile-address-header">
                <div>
                  <h2 className="display-font profile-panel-title">Address</h2>
                  <p className="profile-address-subtitle">
                    {addressId ? 'Primary address summary' : 'No address saved yet.'}
                  </p>
                </div>
                {!loadingAddress ? (
                  <button
                    type="button"
                    className="action-btn action-btn-outline address-action-btn"
                    onClick={() => {
                      clearFeedback()
                      setEditingAddress(true)
                    }}
                  >
                    <span className="address-action-icon" aria-hidden="true">
                      {addressId ? <FiEdit2 /> : <FiPlus />}
                    </span>
                    {addressId ? 'Edit' : 'Create'}
                  </button>
                ) : null}
              </div>

              {loadingAddress ? <p className="profile-address-subtitle">Loading address...</p> : null}

              {!loadingAddress && !addressId ? (
                <p className="profile-address-subtitle">Create your first address to start receiving deliveries.</p>
              ) : null}

              {!loadingAddress && addressId ? (
                <div className="profile-address-preview">
                  <p>{addressForm.fullName}</p>
                  <p>
                    {addressForm.city}, {addressForm.stateCode} {addressForm.postalCode}
                  </p>
                  <p className="profile-address-tag">
                    {addressForm.addressType.toUpperCase()} {addressForm.isDefault ? '· DEFAULT' : ''}
                  </p>
                </div>
              ) : null}
            </article>
          </div>
        </div>

        {editingAddress ? (
          <article className="profile-panel profile-address-panel" ref={addressFormRef}>
            <div className="profile-address-header">
              <div>
                <h2 className="display-font profile-panel-title">{addressId ? 'Edit Address' : 'Create Address'}</h2>
                <p className="profile-address-subtitle">Fill in your shipping or billing address details.</p>
              </div>
              <button
                type="button"
                className="action-btn action-btn-outline"
                onClick={() => {
                  setEditingAddress(false)
                  clearFeedback()
                }}
              >
                Close
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSaveAddress}>
              <div className="auth-form-grid">
                <label className="field-wrap">
                  <span>Address Type</span>
                  <CustomSelect
                    label="Address Type"
                    value={addressForm.addressType}
                    onChange={(nextValue) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        addressType: nextValue,
                      }))
                    }
                    options={addressTypeOptions}
                    placeholder="Select address type"
                  />
                </label>

                <label className="field-wrap">
                  <span>Full Name</span>
                  <input
                    className="auth-input"
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressChange}
                    required
                    placeholder="Recipient full name"
                  />
                </label>

                <label className="field-wrap">
                  <span>Company</span>
                  <input
                    className="auth-input"
                    name="company"
                    value={addressForm.company}
                    onChange={handleAddressChange}
                    placeholder="Optional"
                  />
                </label>

                <label className="field-wrap">
                  <span>Phone</span>
                  <input
                    className="auth-input"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressChange}
                    placeholder="Optional"
                  />
                </label>

                <label className="field-wrap auth-field-full">
                  <span>Address Line 1</span>
                  <input
                    className="auth-input"
                    name="addressLine1"
                    value={addressForm.addressLine1}
                    onChange={handleAddressChange}
                    required
                    placeholder="Street address"
                  />
                </label>

                <label className="field-wrap auth-field-full">
                  <span>Address Line 2</span>
                  <input
                    className="auth-input"
                    name="addressLine2"
                    value={addressForm.addressLine2}
                    onChange={handleAddressChange}
                    placeholder="Apartment, suite, etc."
                  />
                </label>

                <label className="field-wrap">
                  <span>City</span>
                  <input
                    className="auth-input"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressChange}
                    required
                    placeholder="City"
                  />
                </label>

                <label className="field-wrap">
                  <span>State</span>
                  <CustomSelect
                    label="State"
                    value={addressForm.stateCode}
                    onChange={(nextValue) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        stateCode: nextValue,
                      }))
                    }
                    options={stateOptions}
                    placeholder="Select state"
                  />
                </label>

                <label className="field-wrap">
                  <span>Postal Code</span>
                  <input
                    className="auth-input"
                    name="postalCode"
                    value={addressForm.postalCode}
                    onChange={handleAddressChange}
                    required
                    placeholder="12345 or 12345-6789"
                  />
                </label>

                <label className="field-wrap">
                  <span>Country</span>
                  <input className="auth-input" value="United States" disabled readOnly />
                </label>

                <label className="field-wrap auth-field-full">
                  <span>Delivery Instructions</span>
                  <textarea
                    className="auth-input"
                    name="deliveryInstructions"
                    rows={3}
                    value={addressForm.deliveryInstructions}
                    onChange={handleAddressChange}
                    placeholder="Optional notes for delivery"
                  />
                </label>
              </div>

              <label className="profile-checkbox-row">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={addressForm.isDefault}
                  onChange={handleAddressChange}
                />
                Set as default for this address type
              </label>

              <button type="submit" className="action-btn action-btn-solid auth-submit" disabled={savingAddress}>
                {savingAddress ? 'Saving address...' : addressId ? 'Save address changes' : 'Create address'}
              </button>
            </form>
          </article>
        ) : null}

        {error ? <p className="auth-message is-error">{error}</p> : null}
        {message ? <p className="auth-message is-success">{message}</p> : null}
      </section>
    </main>
  )
}

export default ProfilePage
