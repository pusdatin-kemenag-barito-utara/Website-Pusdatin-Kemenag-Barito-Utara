"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="md:hidden flex items-center">
      <button
        onClick={toggleMenu}
        className="p-2 text-slate-700 dark:text-slate-200 hover:text-[#006838] transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mounted && createPortal(
        <div className="md:hidden">
          <div
            className={cn(
              "fixed inset-0 bg-black/30 z-[90] transition-opacity duration-300",
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={closeMenu}
          />

          <div
            className={cn(
              "fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-slate-950 shadow-xl z-[100] flex flex-col transition-transform duration-300 ease-in-out transform",
              isOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white text-sm">Menu</span>
              <button
                onClick={closeMenu}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col p-3 gap-0.5">
              <Link href="/" onClick={closeMenu} className="px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">Beranda</Link>
              <Link href="/profil" onClick={closeMenu} className="px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">Profil</Link>
              <Link href="/layanan" onClick={closeMenu} className="px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">Layanan Aplikasi</Link>
              <Link href="/pengumuman" onClick={closeMenu} className="px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">Pengumuman</Link>

              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 px-3">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center justify-center rounded-md bg-[#006838] hover:bg-[#005530] px-4 py-2.5 text-sm font-medium text-white transition-colors w-full"
                >
                  Login Admin
                </Link>
              </div>
            </nav>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
