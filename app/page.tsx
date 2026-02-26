"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";href
import Link from "next/link";

type Surgeon = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
      setLoading(false);
      if (data.session) fetchSurgeons();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      if (session) fetchSurgeons();
      if (!session) setSurgeons([]);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

 async function fetchSurgeons() {
  const { data, error } = await supabase
    .from("surgeons")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true });

  if (error) {
    alert(error.message);
    return;
  }
  setSurgeons(data ?? []);
}

  async function addSurgeon() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) return alert("Add first and last name.");

    const { error } = await supabase.from("surgeons").insert({
      user_id: data.user.id,
      first_name: fn,
      last_name: ln,
    });

    if (error) return alert(error.message);

    setFirstName("");
    setLastName("");
    fetchSurgeons();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded shadow p-6 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-2">ORMastery</h1>
          <p className="text-sm text-gray-600 mb-4">
            Please log in to view your surgeons.
          </p>
          <a
            href="/login"
            className="block text-center bg-blue-600 text-white py-2 rounded"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
     <div className="flex items-center justify-between mb-4">
  <div>
    <h1 className="text-2xl font-bold">ORMastery</h1>
    <div className="text-xs text-red-600 font-bold">
      VERSION: 2026-02-25-A
    </div>
  </div>
        <button
          onClick={logout}
          className="text-sm bg-gray-900 text-white px-3 py-2 rounded"
        >
          Logout
        </button>
      </div>

      <div className="mb-6 bg-white rounded shadow p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="border p-2 rounded w-full"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <button
            onClick={addSurgeon}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto"
          >
            Add Surgeon
          </button>
        </div>
      </div>

   <ul className="space-y-2">
  {surgeons.map((s) => (
    <li key={s.id}>
      <a
  href={`/s/${s.id}`}
  target="_blank"
  rel="noreferrer"
  className="block p-4 bg-white rounded shadow border border-gray-200 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
  style={{ pointerEvents: "auto" }}
>
        <div className="text-lg font-semibold text-gray-900">
          {s.first_name} {s.last_name}
        </div>
        <div className="text-xs text-gray-500">{s.id}</div>
      </a>
    </li>
  ))}
</ul>
    </div>
  );
}