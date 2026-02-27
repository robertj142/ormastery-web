"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function HeaderBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Close menu when clicking/tapping outside or pressing Esc
  useEffect(() => {
    if (!menuOpen) return;

    const onOutside = (e: Event) => {
      const target = e.target as Node | null;
      if (!target) return;

      // If click/tap is NOT inside the menu container, close it
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    // Capture phase makes this far more reliable across weird DOM layering
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("touchstart", onOutside, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onOutside, true);
      document.removeEventListener("touchstart", onOutside, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function logout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="OR Mastery"
            width={182}
            height={57}
            priority
          />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg border border-brand-accent text-brand-accent hover:bg-brand-dark hover:text-white transition"
            aria-label="menu"
            type="button"
          >
            ☰
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-white border rounded-xl shadow-lg py-2">
              {isAuthed ? (
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  type="button"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}