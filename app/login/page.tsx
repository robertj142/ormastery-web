"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit() {
    if (!email || !password) return alert("Enter email + password.");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return alert(error.message);
      alert("Account created. You can now log in.");
      setMode("login");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return alert(error.message);

    // Go to home after login
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <div className="p-6 bg-white rounded shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">ORMastery</h1>
        <p className="text-sm text-gray-600 mb-6">
          {mode === "login" ? "Log in" : "Create an account"}
        </p>

        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          placeholder="you@email.com"
          className="border p-2 w-full mb-4 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <label className="text-sm font-medium">Password</label>
        <input
          type="password"
          placeholder="••••••••"
          className="border p-2 w-full mb-4 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          {mode === "login" ? "Log In" : "Sign Up"}
        </button>

        <button
          className="text-sm text-blue-700 mt-4 w-full"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}