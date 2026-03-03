"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

type Props = {
  href?: string; // optional: if you want to force a specific route
  className?: string;
  size?: number; // px
};

export default function BackButton({ href, className = "", size = 34 }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      className={`inline-flex items-center justify-center rounded-full p-1 hover:bg-white/10 active:bg-white/15 transition ${className}`}
      aria-label="Back"
    >
      <Image
        src="/back.png"
        alt="Back"
        width={size}
        height={size}
        priority
      />
    </button>
  );
}