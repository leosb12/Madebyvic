import { Link } from 'react-router-dom'
import { FaInstagram, FaEnvelope } from 'react-icons/fa'

export default function SiteFooter() {
  return (
    <footer className="w-full bg-[#101010] py-12 text-white border-t border-white/10 mt-auto">
      <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-6 px-6 sm:flex-row sm:px-10 lg:px-16">
        
        {/* Brand / Logo */}
        <div className="text-center sm:text-left">
          <Link to="/" className="display-font text-3xl tracking-[0.1em] text-white hover:text-white/80 transition uppercase">
            MADEBYVIC
          </Link>
        </div>

        {/* Links / Contact */}
        <div className="flex items-center gap-8">
          <a
            href="https://instagram.com/_madeby.vic"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm tracking-widest text-white/70 transition hover:text-white"
          >
            <FaInstagram size={20} />
            <span className="hidden sm:inline">@_madeby.Vic</span>
          </a>
          
          <a
            href="mailto:contact@madebyvic.com"
            className="flex items-center gap-3 text-sm tracking-widest text-white/70 transition hover:text-white"
          >
            <FaEnvelope size={20} />
            <span className="hidden uppercase sm:inline">Contact</span>
          </a>
        </div>
      </div>
      
      <div className="mt-12 border-t border-white/10 pt-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
          &copy; {new Date().getFullYear()} MADEBYVIC. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  )
}