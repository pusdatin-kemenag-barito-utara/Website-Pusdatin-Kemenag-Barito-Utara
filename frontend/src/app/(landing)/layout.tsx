import Link from "next/link";
import { ThemeToggleBtn } from "@/components/ui/ThemeToggleBtn";
import { MobileNav } from "@/components/landing/MobileNav";
import { ExternalLink, MapPin, Mail, Phone, LogIn } from "lucide-react";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors scroll-smooth flex flex-col">
      {/* Main Navbar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/branding/pusdatin.png"
              alt="Logo PUSDATIN"
              className="h-9 w-auto shrink-0 object-contain"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight hidden sm:block">
                PUSDATIN
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight sm:hidden">
                PUSDATIN
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Kemenag Barito Utara
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Beranda
            </Link>
            <Link
              href="/profil"
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Profil
            </Link>
            <Link
              href="/layanan"
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Layanan Aplikasi
            </Link>
            <Link
              href="/pengumuman"
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Pengumuman
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggleBtn />
            <Link
              href="/login"
              className="group hidden sm:inline-flex items-center gap-2 rounded-lg bg-[#006838] hover:bg-[#005530] text-white px-4 py-2 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 group-hover:scale-110 transition-transform duration-200" />
              <span>Login Admin</span>
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 pt-12 pb-6 shrink-0 w-full border-t border-slate-200 dark:border-slate-800 transition-colors">
        <div className="w-full px-6 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Column 1 - About */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-1 rounded">
                  <img
                    src="/branding/pusdatin.png"
                    alt="PUSDATIN"
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="text-slate-900 dark:text-white font-bold text-sm">PUSDATIN</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kemenag Kab. Barito Utara
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Pusat Data dan Teknologi Informasi — portal pengelolaan data master dan
                layanan aplikasi terpadu Kementerian Agama Kabupaten Barito
                Utara.
              </p>
            </div>

            {/* Column 2 - Contact */}
            <div>
              <p className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Kontak</p>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    Jl. Ahmad Yani No. 126, Muara Teweh, Barito Utara,
                    Kalimantan Tengah
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <a
                    href="https://wa.me/6285117491212"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#006838] dark:hover:text-emerald-400 transition-colors"
                  >
                    085117491212
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <a
                    href="mailto:baritoutara@kemenag.go.id"
                    className="hover:text-[#006838] dark:hover:text-emerald-400 transition-colors"
                  >
                    baritoutara@kemenag.go.id
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 - Links (Hidden on Mobile) */}
            <div className="hidden md:block">
              <p className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Tautan</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/" className="hover:text-[#006838] dark:hover:text-emerald-400 transition-colors">
                    Beranda
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profil"
                    className="hover:text-[#006838] dark:hover:text-emerald-400 transition-colors"
                  >
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link
                    href="/layanan"
                    className="hover:text-[#006838] dark:hover:text-emerald-400 transition-colors"
                  >
                    Daftar Aplikasi
                  </Link>
                </li>
                <li>
                  <a
                    href="https://baritoutara.kemenag.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#006838] dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                  >
                    Website Kemenag <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4 - Social Media */}
            <div>
              <p className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Ikuti Kami</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Dapatkan informasi dan pembaruan terbaru mengenai layanan kami melalui media sosial.
              </p>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700/50"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-pink-500 dark:hover:text-pink-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700/50"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700/50"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.34 1.52-1.4 2.52-.07.96.34 1.95 1.07 2.57.77.67 1.85.91 2.82.72 1.1-.2 2.05-.99 2.45-2.03.22-.55.3-1.15.3-1.74.01-4.8.01-9.6 0-14.4z"/>
                  </svg>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700/50"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-5 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} PUSDATIN Kementerian Agama Kabupaten
              Barito Utara
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
