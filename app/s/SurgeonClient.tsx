"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Surgeon = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
};

type Procedure = {
  id: string;
  name: string;
};

export default function SurgeonClient() {
  const sp = useSearchParams();
  const surgeonId = sp.get("id");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [newProcedureName, setNewProcedureName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!surgeonId) {
      setLoading(false);
      return;
    }
    loadAll(surgeonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surgeonId]);

  async function loadAll(id: string) {
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

    const { data: sData, error: sErr } = await supabase
      .from("surgeons")
      .select("id, user_id, first_name, last_name, specialty")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (sErr) {
      setErr(sErr.message);
      setLoading(false);
      return;
    }

    setSurgeon(sData ?? null);

    const { data: pData, error: pErr } = await supabase
      .from("procedures")
      .select("id, name")
      .eq("surgeon_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (pErr) {
      setErr(pErr.message);
      setProcedures([]);
      setLoading(false);
      return;
    }

    setProcedures(pData ?? []);
    setLoading(false);
  }

  async function addProcedure() {
    const name = newProcedureName.trim();
    if (!name) return alert("Enter a procedure name.");
    if (!surgeonId) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    setAdding(true);

    const { error } = await supabase.from("procedures").insert({
      user_id: sessionData.session.user.id,
      surgeon_id: surgeonId,
      name,
      draping: "",
      instruments_trays: "",
      workflow_notes: "",
    });

    setAdding(false);

    if (error) return alert(error.message);

    setNewProcedureName("");
    loadAll(surgeonId);
  }

  if (!surgeonId) {
    return (
      <div className="min-h-screen p-6">
        <a href="/" className="text-blue-700 underline">
          Back
        </a>
        <div className="mt-6 text-gray-900 font-semibold">Missing surgeon id.</div>
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

  if (!surgeon) {
    return (
      <div className="min-h-screen p-6">
        <div className="mt-6 text-gray-900 font-semibold">Surgeon not found.</div>
        {err ? <div className="mt-2 text-sm text-red-600">Error: {err}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
  <div className="px-6 py-4 flex items-center justify-between">
    <button className="p-2 rounded-lg border text-gray-900" aria-label="menu">
      ☰
    </button>

    <button onClick={() => router.back()} className="text-blue-700 underline">
      Back
    </button>
  </div>


      <div className="px-6 pt-6 pb-2">
        <div className="text-3xl font-black tracking-tight text-gray-900">
          DR.{" "}
          <span className="text-teal-600">
            {surgeon.first_name} {surgeon.last_name}
          </span>
        </div>
      </div>

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
            <div className="mt-3 text-sm text-gray-600">Specialty: {surgeon.specialty}</div>
          ) : null}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-gray-50 border rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-sm font-semibold text-gray-900">Add a procedure</div>
          <input
            className="border p-3 rounded-xl"
            placeholder='e.g., "MicroPort Knee", "rTSA – Catalyst"'
            value={newProcedureName}
            onChange={(e) => setNewProcedureName(e.target.value)}
          />
          <button
            onClick={addProcedure}
            disabled={adding}
            className="bg-brand-accent text-white py-3 rounded-xl font-semibold disabled:opacity-60"
          >
            {adding ? "Adding…" : "+ Add Procedure"}
          </button>
        </div>
      </div>

      <div className="px-6 pb-10 space-y-6">
        {procedures.map((p) => (
          <a
            key={p.id}
            href={`/procedure?procedureId=${p.id}&surgeonId=${surgeonId}`}
            className="block w-full border-4 border-gray-900 rounded-2xl py-10 text-4xl font-medium text-gray-900 text-center"
          >
            {p.name}
          </a>
        ))}

        {procedures.length === 0 ? (
          <div className="text-gray-600 text-sm">No procedures yet. Add one above.</div>
        ) : null}
      </div>
    </div>
  );
}