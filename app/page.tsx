"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

type Surgeon = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
};

function initials(fn?: string | null, ln?: string | null) {
  const a = (fn ?? "").trim().slice(0, 1).toUpperCase();
  const b = (ln ?? "").trim().slice(0, 1).toUpperCase();
  return (a + b) || "DR";
}

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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      if (session) fetchSurgeons();
      if (!session) setSurgeons([]);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSurgeons() {
    const { data, error } = await supabase
      .from("surgeons")
      .select("id, first_name, last_name, photo_url")
      .order("last_name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setSurgeons((data as Surgeon[]) ?? []);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-white/80">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur rounded-3xl border border-white/15 shadow-2xl p-6 w-full max-w-sm">
          <p className="text-sm text-white/80 mb-4">
            Please log in to view your surgeons.
          </p>
          <a
            href="/login"
            className="block text-center bg-brand-accent text-white py-3 rounded-2xl font-semibold"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="bg-white/10 backdrop-blur rounded-3xl border border-white/15 shadow-2xl p-6">
          {/* Add Surgeon Button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="bg-brand-accent text-white px-5 py-3 rounded-2xl font-semibold"
              type="button"
            >
              + Add Surgeon
            </button>

            <div className="text-xs text-white/60">
              {surgeons.length} surgeon{surgeons.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Surgeon List */}
          <ul className="space-y-3">
            {surgeons.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/s?id=${s.id}`}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  {/* Thumbnail */}
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold">
                    {s.photo_url ? (
                      // Using <img> keeps it simple with remote supabase URLs
                      <img
                        src={s.photo_url}
                        alt={`${s.first_name} ${s.last_name}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm">
                        {initials(s.first_name, s.last_name)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-white truncate">
                      Dr. {s.first_name} {s.last_name}
                    </div>
                  </div>

                  <div className="text-white/70 group-hover:text-white transition">
                    ›
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {surgeons.length === 0 ? (
            <div className="mt-6 text-sm text-white/70">
              No surgeons yet. Click <b>+ Add Surgeon</b> to create one.
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal */}
      {showModal ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl border border-white/15 shadow-2xl p-6">
            <div className="text-lg font-black text-white mb-4">Add Surgeon</div>

            <div className="flex flex-col gap-3">
              <input
                className="rounded-2xl p-4 bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/40"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="rounded-2xl p-4 bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/40"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />

              <button
                onClick={addSurgeon}
                disabled={adding}
                className="bg-brand-accent text-white py-3 rounded-2xl font-semibold disabled:opacity-60"
                type="button"
              >
                {adding ? "Adding…" : "Create"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="text-sm text-white/70 underline"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}