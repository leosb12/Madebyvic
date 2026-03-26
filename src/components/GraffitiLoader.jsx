function GraffitiLoader({ isVisible }) {
  if (!isVisible) {
    return null
  }

  return (
    <div className="graffiti-loader" role="status" aria-live="polite" aria-label="Loading page assets">
      <img src="/logo1.png" alt="Made by Vic" className="brand-loader-logo" />
      <div className="brand-loader-progress">
        <div className="brand-loader-progress-bar" />
      </div>
    </div>
  )
}

export default GraffitiLoader
