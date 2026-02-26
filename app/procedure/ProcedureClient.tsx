"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Procedure = {
  id: string;
  name: string;
  draping: string | null;
  instruments_trays: string | null;
  workflow_notes: string | null;
};

export default function ProcedureClient() {
  const sp = useSearchParams();
  const procedureId = sp.get("procedureId");
  const surgeonId = sp.get("surgeonId");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [proc, setProc] = useState<Procedure | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [draping, setDraping] = useState("");
  const [instruments, setInstruments] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!procedureId) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureId]);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("procedures")
      .select("id, name, draping, instruments_trays, workflow_notes")
      .eq("id", procedureId!)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setProc(data ?? null);
    setDraping(data?.draping ?? "");
    setInstruments(data?.instruments_trays ?? "");
    setWorkflow(data?.workflow_notes ?? "");
    setLoading(false);
  }

  async function save() {
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

  if (!procedureId) {
    return (
      <div className="min-h-screen p-6">
        <button onClick={() => router.back()} className="text-blue-700 underline">
  Back
</button>
        <div className="mt-6 font-semibold">Missing procedureId.</div>
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
        <a href={surgeonId ? `/s?id=${surgeonId}` : "/"} className="text-blue-700 underline">
          Back
        </a>
        <div className="mt-6 font-semibold">Procedure not found.</div>
        {err ? <div className="mt-2 text-sm text-red-600">Error: {err}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <a href={surgeonId ? `/s?id=${surgeonId}` : "/"} className="text-blue-700 underline">
          Back
        </a>
        <button
          onClick={save}
          disabled={saving}
          className="bg-brand-accent text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="text-2xl font-black text-gray-900 mb-6">{proc.name}</div>

      <div className="space-y-6">
        <Box title="Draping">
          <textarea
            className="w-full border rounded-xl p-3 min-h-[120px]"
            value={draping}
            onChange={(e) => setDraping(e.target.value)}
          />
        </Box>

        <Box title="Instruments / Trays">
          <textarea
            className="w-full border rounded-xl p-3 min-h-[160px]"
            value={instruments}
            onChange={(e) => setInstruments(e.target.value)}
          />
        </Box>

        <Box title="Workflow / Notes">
          <textarea
            className="w-full border rounded-xl p-3 min-h-[160px]"
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
          />
        </Box>

        <Box title="Setup Photos">
          <div className="text-sm text-gray-600">
            Photo upload comes next (routing is now stable).
          </div>
        </Box>
      </div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-2xl p-4">
      <div className="font-bold text-gray-900 mb-3">{title}</div>
      {children}
    </div>
  );
}