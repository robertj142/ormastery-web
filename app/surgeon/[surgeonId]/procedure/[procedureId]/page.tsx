"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

type Procedure = {
  id: string;
  user_id: string;
  surgeon_id: string;
  name: string;
  draping: string | null;
  instruments_trays: string | null;
  workflow_notes: string | null;
};

type ProcPhoto = {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
};

export default function ProcedurePage() {
  const params = useParams();
  const surgeonId = params?.surgeonId as string | undefined;
  const procedureId = params?.procedureId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [proc, setProc] = useState<Procedure | null>(null);
  const [photos, setPhotos] = useState<ProcPhoto[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [draping, setDraping] = useState("");
  const [instruments, setInstruments] = useState("");
  const [workflow, setWorkflow] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canLoad = useMemo(() => !!surgeonId && !!procedureId, [surgeonId, procedureId]);

  useEffect(() => {
    if (!canLoad) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  async function loadAll() {
    setLoading(true);
    setErrMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }
    const userId = sessionData.session.user.id;

    // Load procedure
    const { data, error } = await supabase
      .from("procedures")
      .select("id, user_id, surgeon_id, name, draping, instruments_trays, workflow_notes")
      .eq("id", procedureId!)
      .eq("surgeon_id", surgeonId!)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setErrMsg(error.message);
      setProc(null);
      setLoading(false);
      return;
    }
    if (!data) {
      setProc(null);
      setLoading(false);
      return;
    }

    setProc(data);
    setDraping(data.draping ?? "");
    setInstruments(data.instruments_trays ?? "");
    setWorkflow(data.workflow_notes ?? "");

    // Load photos
    const { data: ph, error: phErr } = await supabase
      .from("procedure_photos")
      .select("id, url, caption, created_at")
      .eq("procedure_id", data.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (phErr) {
      setErrMsg(phErr.message);
      setPhotos([]);
      setLoading(false);
      return;
    }

    setPhotos(ph ?? []);
    setLoading(false);
  }

  async function saveText() {
    if (!proc) return;

    setSaving(true);

    const { error } = await supabase
      .from("procedures")
      .update({
        draping,
        instruments_trays: instruments,
        workflow_notes: workflow,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proc.id);

    setSaving(false);

    if (error) return alert(error.message);
  }

  async function handleUpload(file: File) {
    if (!proc) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }
    const userId = sessionData.session.user.id;

    setUploading(true);

    const safeName = file.name.replaceAll(" ", "_");
    const path = `${userId}/${proc.id}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase
      .storage
      .from("procedure-photos")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setUploading(false);
      alert(upErr.message);
      return;
    }

    const { data: pub } = supabase.storage
      .from("procedure-photos")
      .getPublicUrl(path);

    const url = pub.publicUrl;

    const { error: dbErr } = await supabase.from("procedure_photos").insert({
      user_id: userId,
      procedure_id: proc.id,
      url,
      caption: null,
    });

    setUploading(false);

    if (dbErr) {
      alert(dbErr.message);
      return;
    }

    await loadAll();
  }

  if (!canLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Loading…
      </div>
    );
  }

  if (!proc) {
    return (
      <div className="min-h-screen p-6">
        <a href={`/surgeon/${surgeonId}`} className="text-blue-700 underline">
          Back
        </a>
        <div className="mt-6 text-gray-900 font-semibold">Procedure not found.</div>
        {errMsg ? <div className="mt-2 text-sm text-red-600">Error: {errMsg}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <a href={`/surgeon/${surgeonId}`} className="text-blue-700 underline">
          Back
        </a>
        <button
          onClick={saveText}
          disabled={saving}
          className="bg-teal-700 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="text-2xl font-black text-gray-900 mb-6">{proc.name}</div>

      <div className="space-y-6">
        <Section title="Draping">
          <textarea
            className="w-full border rounded-xl p-3 min-h-[120px]"
            value={draping}
            onChange={(e) => setDraping(e.target.value)}
            placeholder="Draping preferences, towels, stockinette, Ioban, etc."
          />
        </Section>

        <Section title="Instruments / Trays">
          <textarea
            className="w-full border rounded-xl p-3 min-h-[160px]"
            value={instruments}
            onChange={(e) => setInstruments(e.target.value)}
            placeholder="Tray order, must-haves, add-ons, special instruments…"
          />
        </Section>

        <Section title="Workflow / Notes">
          <textarea
            className="w-full border rounded-xl p-3 min-h-[160px]"
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
            placeholder="Sequence, surgeon quirks, timing, closure, common pivots…"
          />
        </Section>

        <Section title="Setup Photos">
          <div className="text-sm text-gray-600 mb-3">
            No patient identifiers. No stickers. No whiteboards.
          </div>

          <label className="inline-block bg-gray-900 text-white px-4 py-2 rounded-xl cursor-pointer">
            {uploading ? "Uploading…" : "Upload Photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.currentTarget.value = "";
              }}
              disabled={uploading}
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" className="block">
                <img
                  src={p.url}
                  alt={p.caption ?? "setup photo"}
                  className="w-full h-40 object-cover rounded-xl border"
                />
              </a>
            ))}
          </div>

          {photos.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">No photos yet.</div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-2xl p-4">
      <div className="font-bold text-gray-900 mb-3">{title}</div>
      {children}
    </div>
  );
}