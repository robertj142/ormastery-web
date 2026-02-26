"use client";

import Image from "next/image";
import Link from "next/link";

export default function HeaderBar() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white shadow-sm">
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
  className="p-2 rounded-lg border border-brand-accent text-brand-accent hover:bg-brand-dark hover:text-white transition"
  aria-label="menu"
  type="button"
  onClick={() => alert("Menu coming next")}
>
  &#9776;
    </header>
  );
}