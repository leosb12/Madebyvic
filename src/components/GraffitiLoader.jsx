function GraffitiLoader({ isVisible }) {
  if (!isVisible) {
    return null
  }

  return (
    <div className="graffiti-loader" role="status" aria-live="polite" aria-label="Loading page assets">
      <div className="graffiti-loader__noise" />
      <div className="graffiti-loader__paint" />
      <div className="graffiti-loader__content">
        <p className="graffiti-loader__tag">Digital Art Gallery</p>
        <h2 className="graffiti-loader__wordmark">MADE BY VIC</h2>
        <div className="graffiti-loader__inkline" />
      </div>
    </div>
  )
}

export default GraffitiLoader
