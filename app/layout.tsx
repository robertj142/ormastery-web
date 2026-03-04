import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeaderBar from "./HeaderBar";
import SplashScreen from "./SplashScreen";

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
      <head>
        {/* PWA / “App-like” chrome removal */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#06121b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* Optional: nicer iOS install title */}
        <meta name="apple-mobile-web-app-title" content="ORMastery" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Splash overlay */}
        <SplashScreen ms={900} />

        {/* App shell */}
        <div className="min-h-screen bg-[linear-gradient(135deg,#00a9be_0%,#00243d_65%,#001a2b_100%)]">
          <HeaderBar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}