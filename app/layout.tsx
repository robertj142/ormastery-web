import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OR Mastery",
  description: "Your Surgical Workflow, Organized.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen bg-gray-100">
          <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white shadow-sm">
  <Link href="/" className="inline-flex items-center">
    <Image
      src="/logo.png"
      alt="OR Mastery"
      width={182}
      height={56}
      priority
    />
  </Link>

  <button
    className="p-2 rounded-lg border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition"
    aria-label="menu"
    type="button"
    onClick={() => alert("Menu coming next")}
  >
    ☰
  </button>
</header>

          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}