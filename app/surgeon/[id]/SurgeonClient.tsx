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

type Procedure = {
  id: string;
  name: string;
};

export default function SurgeonClient({ surgeonId }: { surgeonId: string }) {
  const [loading, setLoading] = useState(true);
  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [newProcedureName, setNewProcedureName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surgeonId]);

  async function loadAll() {
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
      .eq("id", surgeonId)
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
      .eq("surgeon_id", surgeonId)
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
    loadAll();
  }

  if (loading) return <div>Loading surgeon…</div>;

  if (!surgeon) {
    return (
      <div>
        <div style={{ fontWeight: 700 }}>Surgeon not found.</div>
        {err ? <div style={{ color: "red" }}>Error: {err}</div> : null}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
        DR. {surgeon.first_name} {surgeon.last_name}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Add a procedure</div>
        <input
          value={newProcedureName}
          onChange={(e) => setNewProcedureName(e.target.value)}
          placeholder='e.g., "MicroPort Knee"'
          style={{
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 10,
            width: "100%",
            maxWidth: 520,
            marginRight: 8,
          }}
        />
        <div style={{ marginTop: 10 }}>
          <button
            onClick={addProcedure}
            disabled={adding}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#0f766e",
              color: "white",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              opacity: adding ? 0.6 : 1,
            }}
          >
            {adding ? "Adding…" : "+ Add Procedure"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
        {procedures.map((p) => (
          <a
            key={p.id}
            href={`/surgeon/${surgeonId}/procedure/${p.id}`}
            style={{
              display: "block",
              padding: "26px 18px",
              border: "4px solid #111",
              borderRadius: 18,
              textAlign: "center",
              fontSize: 28,
              fontWeight: 600,
              color: "#111",
              textDecoration: "none",
            }}
          >
            {p.name}
          </a>
        ))}
        {procedures.length === 0 ? (
          <div style={{ color: "#666" }}>No procedures yet.</div>
        ) : null}
      </div>
    </div>
  );
}