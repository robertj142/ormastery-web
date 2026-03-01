"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Procedure = {
  id: string;
  name: string;
  draping: string | null;
  instruments_trays: string | null;
  workflow_notes: string | null;
};

type SectionKey = "draping" | "instruments" | "workflow";

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

  // Modal viewer
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  // Autoscroll
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [autoScrollOn, setAutoScrollOn] = useState(true);

  // px/sec (iPhone-safe defaults)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(22);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const carryRef = useRef<number>(0);

  const sectionTitle = useMemo(() => {
    if (!openSection) return "";
    if (openSection === "draping") return "Draping";
    if (openSection === "instruments") return "Instruments / Trays";
    return "Workflow / Notes";
  }, [openSection]);

  const sectionBody = useMemo(() => {
    if (!openSection) return "";
    if (openSection === "draping") return draping || "";
    if (openSection === "instruments") return instruments || "";
    return workflow || "";
  }, [openSection, draping, instruments, workflow]);

  useEffect(() => {
    if (!procedureId) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureId]);

  async function requireSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session) {
      window.location.href = "/login";
      throw new Error("Not authenticated");
    }
    return data.session;
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const session = await requireSession();
      const userId = session.user.id;

      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, draping, instruments_trays, workflow_notes")
        .eq("id", procedureId!)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw new Error(error.message);

      setProc(data ?? null);
      setDraping(data?.draping ?? "");
      setInstruments(data?.instruments_trays ?? "");
      setWorkflow(data?.workflow_notes ?? "");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setProc(null);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!proc) return;

    try {
      setSaving(true);
      await requireSession();

      const { error } = await supabase
        .from("procedures")
        .update({
          draping,
          instruments_trays: instruments,
          workflow_notes: workflow,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proc.id);

      if (error) throw new Error(error.message);
    } catch (e: any) {
      alert(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function stopAutoScroll() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = 0;
    carryRef.current = 0;
  }

  function startAutoScroll() {
    stopAutoScroll();

    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    const loop = (ts: number) => {
      const node = scrollRef.current;
      if (!node) return;

      const max = node.scrollHeight - node.clientHeight;
      if (max <= 0) return;

      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      // Accumulate fractional pixels so iPhone "slow" actually moves
      carryRef.current += (autoScrollSpeed * dt) / 1000;

      const step = Math.floor(carryRef.current);
      if (step >= 1) {
        carryRef.current -= step;

        const next = node.scrollTop + step;

        // Loop behavior: pause at bottom, jump to top, continue
        if (next >= max - 1) {
          node.scrollTop = max;
          stopAutoScroll();

          window.setTimeout(() => {
            const n = scrollRef.current;
            if (!n) return;
            n.scrollTop = 0;
            if (autoScrollOn) startAutoScroll();
          }, 700);

          return;
        }

        node.scrollTop = next;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    if (!openSection) {
      stopAutoScroll();
      return;
    }
    if (!autoScrollOn) {
      stopAutoScroll();
      return;
    }

    // Start immediately (no lag). Double rAF ensures layout is ready.
    const t = window.setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          startAutoScroll();
        });
      });
    }, 0);

    return () => {
      window.clearTimeout(t);
      stopAutoScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSection, autoScrollOn, autoScrollSpeed, sectionBody]);

  if (!procedureId) {
    return (
      <div className="min-h-screen p-6">
        <button
          onClick={() => router.back()}
          className="text-brand-accent underline"
          type="button"
        >
          Back
        </button>
        <div className="mt-6 font-semibold text-white">Missing procedureId.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-white/80">
        Loading…
      </div>
    );
  }

  if (!proc) {
    return (
      <div className="min-h-screen p-6">
        <a
          href={surgeonId ? `/s?id=${surgeonId}` : "/"}
          className="text-brand-accent underline"
        >
          Back
        </a>
        <div className="mt-6 font-semibold text-white">Procedure not found.</div>
        {err ? (
          <div className="mt-2 text-sm text-red-200">Error: {err}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Top controls */}
      <div className="flex items-center justify-between mb-6">
        <a
          href={surgeonId ? `/s?id=${surgeonId}` : "/"}
          className="text-brand-accent underline"
        >
          Back
        </a>

        <button
          onClick={save}
          disabled={saving}
          className="bg-brand-accent text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
          type="button"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Glass card wrapper like your login vibe */}
      <div className="mx-auto w-full max-w-3xl">
        <div className="bg-white/10 backdrop-blur rounded-3xl border border-white/15 shadow-2xl p-6">
          <div className="text-2xl font-black text-white mb-6">{proc.name}</div>

          <div className="space-y-6">
            <SectionBox
              title="Draping"
              onExpand={() => setOpenSection("draping")}
            >
              <textarea
                className="w-full rounded-2xl p-4 min-h-[120px] bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/40"
                value={draping}
                onChange={(e) => setDraping(e.target.value)}
                placeholder="Draping notes..."
              />
            </SectionBox>

            <SectionBox
              title="Instruments / Trays"
              onExpand={() => setOpenSection("instruments")}
            >
              <textarea
                className="w-full rounded-2xl p-4 min-h-[160px] bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/40"
                value={instruments}
                onChange={(e) => setInstruments(e.target.value)}
                placeholder="Instrument and tray notes..."
              />
            </SectionBox>

            <SectionBox
              title="Workflow / Notes"
              onExpand={() => setOpenSection("workflow")}
            >
              <textarea
                className="w-full rounded-2xl p-4 min-h-[160px] bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/40"
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value)}
                placeholder="Workflow notes..."
              />
            </SectionBox>

            <SectionBox title="Setup Photos" onExpand={undefined}>
              <div className="text-sm text-white/75">
                Setup photo upload comes next. We’ll add a Supabase storage bucket
                for procedure photos and tie it to this procedure.
              </div>
            </SectionBox>
          </div>
        </div>
      </div>

      {/* EXPAND MODAL (scrubbed-in view) */}
      {openSection ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#06121b]/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div className="text-white font-black text-lg">{sectionTitle}</div>

              <button
                onClick={() => setOpenSection(null)}
                className="text-white/80 hover:text-white text-sm underline"
                type="button"
              >
                Close
              </button>
            </div>

            {/* Controls row */}
            <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-white/10">
              <button
                onClick={() => setAutoScrollOn((v) => !v)}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold"
                type="button"
              >
                {autoScrollOn ? "Auto-scroll: ON" : "Auto-scroll: OFF"}
              </button>

              <div className="flex items-center gap-2">
                <div className="text-white/70 text-sm">Speed</div>
                <select
                  value={autoScrollSpeed}
                  onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                  className="bg-white/10 border border-white/15 text-white text-sm rounded-xl px-3 py-2 outline-none"
                >
                  <option value={14}>Slow</option>
                  <option value={22}>Normal</option>
                  <option value={32}>Fast</option>
                </select>
              </div>

              <button
                onClick={() => {
                  if (!scrollRef.current) return;
                  scrollRef.current.scrollTop = 0;
                }}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold"
                type="button"
              >
                Restart
              </button>
            </div>

            {/* Scroll area */}
            <div
              ref={scrollRef}
              className="max-h-[70vh] overflow-y-auto px-6 py-6"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="whitespace-pre-wrap text-white text-[22px] leading-relaxed">
                {sectionBody?.trim() ? sectionBody : "—"}
              </div>

              <div className="h-10" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionBox({
  title,
  children,
  onExpand,
}: {
  title: string;
  children: React.ReactNode;
  onExpand?: (() => void) | undefined;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-black text-white">{title}</div>

        {onExpand ? (
          <button
            onClick={onExpand}
            className="text-white/85 hover:text-white text-sm underline"
            type="button"
            aria-label={`Expand ${title}`}
          >
            Expand
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}