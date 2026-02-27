"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function HeaderBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthed(!!session);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
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

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg border border-brand-accent text-brand-accent hover:bg-brand-dark hover:text-white transition"
          aria-label="menu"
          type="button"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-6 top-20 w-48 bg-white border rounded-xl shadow-lg py-2">
          {isAuthed ? (
            <button
              onClick={logout}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="block px-4 py-2 hover:bg-gray-100"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}