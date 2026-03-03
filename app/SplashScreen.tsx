"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({ ms = 900 }: { ms?: number }) {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setFade(true), Math.max(0, ms - 250));
    const t2 = window.setTimeout(() => setShow(false), ms);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ms]);

  if (!show) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-[linear-gradient(135deg,#00a9be_0%,#00243d_65%,#001a2b_100%)]",
        "transition-opacity duration-200",
        fade ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
      aria-label="Loading"
    >
      <div className="relative flex items-center justify-center">
        {/* Spinner ring */}
        <div className="h-56 w-56 rounded-full border-[10px] border-white/15 relative">
          <div className="absolute inset-0 rounded-full border-[10px] border-transparent border-t-white/70 animate-spin" />
        </div>

        {/* Logo in the middle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/icon.png"
            alt="OR Mastery"
            className="h-28 w-28 object-contain drop-shadow-xl"
            draggable={false}
          />
        </div>

        {/* Optional percent text vibe */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-white/80 text-sm font-semibold">
          Loading…
        </div>
      </div>
    </div>
  );
}