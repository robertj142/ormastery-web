"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
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

  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
      setLoading(false);
      if (data.session) fetchSurgeons();
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthed(!!session);
        if (session) fetchSurgeons();
        if (!session) setSurgeons([]);
      }
    );

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

    setAdding(true);

    const { error } = await supabase.from("surgeons").insert({
      user_id: data.user.id,
      first_name: fn,
      last_name: ln,
    });

    setAdding(false);

    if (error) {
      alert(error.message);
      return;
    }

    setFirstName("");
    setLastName("");
    setShowModal(false);
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
          <p className="text-sm text-gray-600 mb-4">
            Please log in to view your surgeons.
          </p>
          <a
            href="/login"
            className="block text-center bg-brand-dark text-white py-2 rounded"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="flex items-center justify-between mb-6">
        

        <button
          onClick={logout}
          className="text-sm bg-gray-900 text-white px-3 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {/* Add Surgeon Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand-dark text-white px-5 py-3 rounded-xl font-semibold"
        >
          + Add Surgeon
        </button>
      </div>

      {/* Surgeon List */}
      <ul className="space-y-3">
        {surgeons.map((s) => (
          <li key={s.id}>
            <Link
              href={`/s?id=${s.id}`}
              className="block p-4 bg-white rounded-xl shadow border border-gray-200 hover:bg-gray-50 transition"
            >
              <div className="text-lg font-semibold text-brand-dark">
                {s.first_name} {s.last_name}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-lg font-bold text-brand-dark mb-4">
              Add Surgeon
            </div>

            <div className="flex flex-col gap-3">
              <input
                className="border p-3 rounded-xl"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="border p-3 rounded-xl"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />

              <button
                onClick={addSurgeon}
                disabled={adding}
                className="bg-brand-accent text-white py-3 rounded-xl font-semibold disabled:opacity-60"
              >
                {adding ? "Adding…" : "Create"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="text-sm text-gray-500 mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}