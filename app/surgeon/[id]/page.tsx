"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function SurgeonDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [stage, setStage] = useState<
    "mounted" | "no-id" | "no-session" | "fetching" | "done" | "error"
  >("mounted");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!id) {
        setStage("no-id");
        return;
      }

      setStage("fetching");

      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (!alive) return;

      if (sessionErr) {
        setErr(sessionErr.message);
        setStage("error");
        return;
      }

      if (!sessionData.session) {
        setStage("no-session");
        return;
      }

      setSessionEmail(sessionData.session.user.email ?? null);

      const userId = sessionData.session.user.id;

      const { data, error } = await supabase
        .from("surgeons")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setStage("error");
        return;
      }

      setPayload(data ?? null);
      setStage("done");
    }

    run();

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div style={{ padding: 16, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          padding: 12,
          border: "3px solid red",
          background: "#fff3f3",
          marginBottom: 12,
          fontWeight: 700,
        }}
      >
        ORMastery Surgeon Page DEBUG
      </div>

      <div style={{ marginBottom: 8 }}>
        <b>Route id:</b> {String(id)}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Stage:</b> {stage}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Session email:</b> {sessionEmail ?? "none"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Error:</b> {err ?? "none"}
      </div>

      <div style={{ marginTop: 16 }}>
        <b>Surgeon payload:</b>
        <pre
          style={{
            marginTop: 8,
            padding: 12,
            background: "#f5f5f5",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ color: "blue" }}>
          Back
        </a>
      </div>
    </div>
  );
}