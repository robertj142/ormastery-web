"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Surgeon = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
};

export default function SurgeonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Placeholder procedures for layout testing (we’ll make these real next step)
  const procedures = [
    "MicroPort Hip",
    "MicroPort Knee",
    "Conformis Knee",
    "Depuy Knee",
  ];

  useEffect(() => {
    fetchSurgeon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function fetchSurgeon() {
    setLoading(true);
    setErrMsg(null);

    // 1) Confirm session exists
    const { data: sessionData, error: sessionErr } =
      await supabase.auth.getSession();

    if (sessionErr) {
      setErrMsg(sessionErr.message);
      setLoading(false);
      return;
    }

    const session = sessionData.session;
    if (!session) {
      window.location.href = "/login";
      return;
    }

    // 2) Fetch surgeon ONLY if it belongs to this user
    const { data, error } = await supabase
      .from("surgeons")
      .select("id, user_id, first_name, last_name, specialty")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      setErrMsg(error.message);
      setSurgeon(null);
      setLoading(false);
      return;
    }

    setSurgeon(data ?? null);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
    );
  }

  if (!surgeon) {
    return (
      <div className="min-h-screen p-6">
        <a href="/" className="text-blue-700 underline">
          Back
        </a>
        <div className="mt-6 text-gray-900 font-semibold">Surgeon not found.</div>
        {errMsg ? (
          <div className="mt-2 text-sm text-red-600">Error: {errMsg}</div>
        ) : (
          <div className="mt-2 text-sm text-gray-600">
            This surgeon either doesn’t exist or doesn’t belong to your account.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-600" />
          <div>
            <div className="text-xl font-bold">
              OR<span className="text-teal-600">Mastery</span>
            </div>
            <div className="text-xs text-gray-600">
              YOUR SURGICAL WORKFLOW, ORGANIZED.
            </div>
          </div>
        </div>

        <button className="p-2 rounded-lg border text-gray-900" aria-label="menu">
          ☰
        </button>
      </div>

      {/* Surgeon header */}
      <div className="px-6 pt-6 pb-2">
        <div className="text-3xl font-black tracking-tight text-gray-900">
          DR.{" "}
          <span className="text-teal-600">
            {surgeon.first_name} {surgeon.last_name}
          </span>
        </div>
      </div>

      {/* Photo + quick sizes */}
      <div className="px-6 py-6 flex gap-6 items-center">
        <div className="h-36 w-36 rounded-xl border-4 border-teal-600 overflow-hidden bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
          Photo
        </div>

        <div className="flex-1">
          <div className="flex gap-10 text-lg text-gray-900">
            <div>
              <div className="text-sm text-gray-500">Gloves</div>
              <div className="font-semibold">—</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Gown</div>
              <div className="font-semibold">—</div>
            </div>
          </div>

          {surgeon.specialty ? (
            <div className="mt-3 text-sm text-gray-600">
              Specialty: {surgeon.specialty}
            </div>
          ) : null}
        </div>
      </div>

      {/* Big procedure buttons */}
      <div className="px-6 pb-10 space-y-6">
        {procedures.map((p) => (
          <button
            key={p}
            className="w-full border-4 border-gray-900 rounded-2xl py-10 text-4xl font-medium text-gray-900"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}