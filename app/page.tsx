"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

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
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center text-sm text-white bg-transparent">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-6 py-10 bg-transparent">
        <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
          <h1 className="text-white text-xl font-semibold">Welcome</h1>
          <p className="text-white/80 text-sm mt-1">
            Please log in to view your surgeons.
          </p>

          <a
            href="/login"
            className="mt-6 block text-center w-full rounded-lg py-2.5 font-semibold text-white bg-[#00243d] hover:opacity-95"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    // IMPORTANT: no background here. Layout provides the gradient.
    <div className="min-h-[calc(100vh-72px)] bg-transparent flex items-start justify-center px-6 py-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-semibold">Your Surgeons</h1>
            <p className="text-white/80 text-sm mt-1">
              Add, manage, and open surgeon profiles.
            </p>
          </div>

          <button
            onClick={logout}
            className="text-sm bg-[#00243d] text-white px-4 py-2 rounded-lg hover:opacity-95"
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#00a9be] text-white px-5 py-3 rounded-lg font-semibold hover:opacity-95"
            type="button"
          >
            + Add Surgeon
          </button>

          <div className="text-white/70 text-sm">
            {surgeons.length} surgeon{surgeons.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {surgeons.map((s) => (
            <Link
              key={s.id}
              href={`/s?id=${s.id}`}
              className="block p-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition"
            >
              <div className="text-lg font-semibold text-white">
                {s.first_name} {s.last_name}
              </div>
            </Link>
          ))}

          {surgeons.length === 0 ? (
            <div className="text-white/80 text-sm bg-white/5 border border-white/15 rounded-xl p-4">
              No surgeons yet. Click <b>+ Add Surgeon</b> to create your first
              profile.
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
            <div className="text-white text-lg font-semibold">Add Surgeon</div>
            <p className="text-white/80 text-sm mt-1">
              Enter the surgeon’s first and last name.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <input
                className="w-full rounded-lg px-3 py-2 bg-white/90 text-gray-900 placeholder:text-gray-500 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#00a9be]"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />

              <input
                className="w-full rounded-lg px-3 py-2 bg-white/90 text-gray-900 placeholder:text-gray-500 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#00a9be]"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />

              <button
                onClick={addSurgeon}
                disabled={adding}
                className="w-full rounded-lg py-2.5 font-semibold text-white bg-[#00243d] hover:opacity-95 disabled:opacity-60"
                type="button"
              >
                {adding ? "Creating..." : "Create"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="w-full rounded-lg py-2.5 font-semibold text-white/90 bg-white/10 border border-white/20 hover:bg-white/20"
                type="button"
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