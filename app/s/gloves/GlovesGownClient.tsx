"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Surgeon = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  gloves: string | null;
  gown: string | null;
};

export default function GlovesGownClient() {
  const sp = useSearchParams();
  const surgeonId = sp.get("id");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [gloves, setGloves] = useState("");
  const [gown, setGown] = useState("");

  useEffect(() => {
    if (!surgeonId) {
      setLoading(false);
      return;
    }
    loadSurgeon(surgeonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surgeonId]);

  async function loadSurgeon(id: string) {
    setLoading(true);
    setErr(null);

    const { data: sessionData, error: sessionErr } =
      await supabase.auth.getSession();

    if (sessionErr) {
      setErr(sessionErr.message);
      setLoading(false);
      return;
    }

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("surgeons")
      .select("id, user_id, first_name, last_name, gloves, gown")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setSurgeon(data ?? null);
    setGloves((data?.gloves ?? "").toString());
    setGown((data?.gown ?? "").toString());
    setLoading(false);
  }

  async function save() {
    if (!surgeonId) return;

    const g1 = gloves.trim();
    const g2 = gown.trim();

    setSaving(true);
    setErr(null);

    const { error } = await supabase
      .from("surgeons")
      .update({ gloves: g1, gown: g2 })
      .eq("id", surgeonId);

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    router.back();
  }

  if (!surgeonId) {
    return (
      <div className="min-h-screen p-6 bg-white">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-brand-accent underline text-sm"
        >
          Back
        </button>
        <div className="mt-6 text-brand-dark font-semibold">
          Missing surgeon id.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600 bg-white">
        Loading…
      </div>
    );
  }

  if (!surgeon) {
    return (
      <div className="min-h-screen p-6 bg-white">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-brand-accent underline text-sm"
        >
          Back
        </button>
        <div className="mt-6 text-brand-dark font-semibold">
          Surgeon not found.
        </div>
        {err ? <div className="mt-2 text-sm text-red-600">Error: {err}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 pt-6 pb-2">
        <div className="text-3xl font-black tracking-tight text-brand-dark">
          Gloves and Gown
        </div>

        <div className="mt-2 text-lg font-semibold text-brand-dark">
          DR.{" "}
          <span className="text-brand-accent">
            {surgeon.first_name} {surgeon.last_name}
          </span>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-2 text-brand-accent underline text-sm"
        >
          Back
        </button>
      </div>

      <div className="px-6 py-6">
        <div className="bg-gray-50 border rounded-2xl p-4 flex flex-col gap-4 max-w-xl">
          <div>
            <div className="text-sm font-semibold text-brand-dark">Gloves</div>
            <input
              className="mt-2 border p-3 rounded-xl w-full"
              placeholder='e.g., "8.5 x 2"'
              value={gloves}
              onChange={(e) => setGloves(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-brand-dark">Gown</div>
            <input
              className="mt-2 border p-3 rounded-xl w-full"
              placeholder='e.g., "XL"'
              value={gown}
              onChange={(e) => setGown(e.target.value)}
            />
          </div>

          {err ? <div className="text-sm text-red-600">Error: {err}</div> : null}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-brand-accent text-white py-3 rounded-xl font-semibold disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}