import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeaderBar from "./HeaderBar";

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
        {/* Angled gradient background applied app-wide */}
        <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,_#00a9be_0%,_#007c93_45%,_#00243d_100%)]">
          <HeaderBar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}