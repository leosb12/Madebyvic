import SiteHeader from '../components/SiteHeader'

function ContactPage() {
  return (
    <div className="min-h-screen bg-[#ece9e4] text-[#101010] selection:bg-black selection:text-white">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-5 pb-16 pt-12 sm:px-7 lg:px-10">
        <section className="rounded-sm border border-black/15 bg-[#ece9e4] p-6 sm:p-8">
          <h1 className="display-font text-4xl uppercase tracking-[0.06em] text-black">Contact</h1>
          <p className="mt-3 text-sm text-black/70">Tell us about your project and we will reach out with next steps.</p>

          <form className="mt-8 grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-black/85">
                <span>First Name (required)</span>
                <input type="text" required className="rounded-full border border-black/45 bg-transparent px-4 py-3 text-black outline-none focus:border-black" />
              </label>
              <label className="grid gap-2 text-sm text-black/85">
                <span>Last Name (required)</span>
                <input type="text" required className="rounded-full border border-black/45 bg-transparent px-4 py-3 text-black outline-none focus:border-black" />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-black/85">
              <span>Email (required)</span>
              <input type="email" required className="rounded-full border border-black/45 bg-transparent px-4 py-3 text-black outline-none focus:border-black" />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-black/85">
              <input type="checkbox" className="h-5 w-5 rounded border border-black/50" />
              <span>Sign up for news and updates</span>
            </label>

            <label className="grid gap-2 text-sm text-black/85">
              <span>Phone</span>
              <input type="tel" className="rounded-full border border-black/45 bg-transparent px-4 py-3 text-black outline-none focus:border-black" />
            </label>

            <fieldset className="grid gap-3">
              <legend className="text-sm text-black/90">What services are you interested in?</legend>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5 rounded border border-black/50" />
                  <span>Commission Art</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5 rounded border border-black/50" />
                  <span>Mural Art</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5 rounded border border-black/50" />
                  <span>Canvas Art</span>
                </label>
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm text-black/85">
              <span>What is your budget?</span>
              <input type="text" className="rounded-full border border-black/45 bg-transparent px-4 py-3 text-black outline-none focus:border-black" />
            </label>

            <label className="grid gap-2 text-sm text-black/85">
              <span>How did you hear about me?</span>
              <select className="rounded-full border border-black/45 bg-transparent px-4 py-3 text-black outline-none focus:border-black">
                <option value="">Select an option</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm text-black/85">
              <span>Message (required)</span>
              <textarea rows={5} required className="rounded-3xl border border-black/45 bg-transparent px-4 py-3 text-black outline-none focus:border-black" />
            </label>

            <button
              type="button"
              className="inline-flex w-fit items-center justify-center rounded-full border border-black bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-85"
            >
              Submit
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default ContactPage
