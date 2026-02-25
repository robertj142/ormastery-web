"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  async function handleLogin() {
    await supabase.auth.signInWithOtp({
      email,
    });
    alert("Check your email for login link.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 bg-white rounded shadow w-80">
        <h1 className="text-xl font-bold mb-4">Login to ORMastery</h1>
        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Send Magic Link
        </button>
      </div>
    </div>
  );
}