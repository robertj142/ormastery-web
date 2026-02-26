"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

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

export default function SurgeonDetailPage() {
  const params = useParams();
  const surgeonId = params?.id as string | undefined;

  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [newProcedureName, setNewProcedureName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!surgeonId) return;
    loadAll(surgeonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surgeonId]);

  async function loadAll(id: string) {
    setLoading(true);
    setErrMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    // Surgeon
    const { data: sData, error: sErr } = await supabase
      .from("surgeons")
      .select("id, user_id, first_name, last_name, specialty")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (sErr) {
      setErrMsg(sErr.message);
      setSurgeon(null);
      setLoading(false);
      return;
    }
    if (!sData) {
      setSurgeon(null);
      setLoading(false);
      return;
    }
    setSurgeon(sData);

    // Procedures
    const { data: pData, error: pErr } = await supabase
      .from("procedures")
      .select("id, name")
      .eq("surgeon_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (pErr) {
      setErrMsg(pErr.message);
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

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    if (!surgeonId) return;

    setAdding(true);

    const userId = sessionData.session.user.id;

    const { error } = await supabase.from("procedures").insert({
      user_id: userId,
      surgeon_id: surgeonId,
      name,
      draping: "",
      instruments_trays: "",
      workflow_notes: "",
    });

    setAdding(false);

    if (error) return alert(error.message);

    setNewProcedureName("");
    await loadAll(surgeonId);
  }

  if (!surgeonId) {
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

  if (!surgeon) {
    return (
      <div className="min-h-screen p-6">
        <a href="/" className="text-blue-700 underline">
          Back
        </a>
        <div className="mt-6 text-gray-900 font-semibold">Surgeon not found.</div>
        {errMsg ? (
          <div className="mt-2 text-sm text-red-600">Error: {errMsg}</div>
        ) : null}
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

      {/* Photo + quick sizes (placeholders for now) */}
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

      {/* Add procedure */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 border rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-sm font-semibold text-gray-900">Add a procedure</div>
          <input
            className="border p-3 rounded-xl"
            placeholder='e.g., "MicroPort Knee", "rTSA – Catalyst", "Hip Revision"'
            value={newProcedureName}
            onChange={(e) => setNewProcedureName(e.target.value)}
          />
          <button
            onClick={addProcedure}
            disabled={adding}
            className="bg-teal-700 text-white py-3 rounded-xl font-semibold disabled:opacity-60"
          >
            {adding ? "Adding…" : "+ Add Procedure"}
          </button>
        </div>
      </div>

      {/* Big procedure buttons */}
      <div className="px-6 pb-10 space-y-6">
        {procedures.length === 0 ? (
          <div className="text-gray-600 text-sm">
            No procedures yet. Add one above.
          </div>
        ) : null}

        {procedures.map((p) => (
          <a
            key={p.id}
            href={`/surgeon/${surgeon.id}/procedure/${p.id}`}
            className="block w-full border-4 border-gray-900 rounded-2xl py-10 text-4xl font-medium text-gray-900 text-center"
          >
            {p.name}
          </a>
        ))}
      </div>
    </div>
  );
}