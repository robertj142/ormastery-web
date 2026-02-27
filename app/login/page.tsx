"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/";
      setChecking(false);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErr("Enter your email and password.");
      return;
    }

    try {
      setWorking(true);

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        window.location.href = "/";
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        setErr(
          "Account created. If email confirmation is enabled, check your inbox. Then log in."
        );
        setMode("login");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setWorking(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-white bg-gradient-to-b from-[#00a9be] via-[#007c93] to-[#00243d]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-gradient-to-b from-[#00a9be] via-[#007c93] to-[#00243d]">
      <div className="max-w-md mx-auto px-6 py-14">
        <div className="rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
          <h1 className="text-white text-xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {mode === "login"
              ? "Log in to access your surgeons and procedures."
              : "Sign up to start building your OR workflow library."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-1">
                Email
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 bg-white/90 text-gray-900 placeholder:text-gray-500 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#00a9be]"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-1">
                Password
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 bg-white/90 text-gray-900 placeholder:text-gray-500 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#00a9be]"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {err ? (
              <div className="text-sm text-white bg-red-500/30 border border-red-400/40 rounded-lg px-3 py-2">
                {err}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={working}
              className="w-full rounded-lg py-2.5 font-semibold text-white bg-[#00243d] hover:opacity-95 disabled:opacity-60"
            >
              {working
                ? mode === "login"
                  ? "Logging in..."
                  : "Signing up..."
                : mode === "login"
                ? "Log In"
                : "Sign Up"}
            </button>

            <div className="text-center text-sm text-white/90 pt-2">
              {mode === "login" ? (
                <>
                  Need an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="underline text-white font-semibold"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="underline text-white font-semibold"
                  >
                    Log in
                  </button>
                </>
              )}
            </div>

            <div className="text-center text-xs text-white/70 pt-2">
              <Link href="/" className="underline">
                Back to home
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}