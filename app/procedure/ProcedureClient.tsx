"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ProcedureRow = {
  id: string;
  user_id: string;
  surgeon_id: string;
  name: string;
  draping: string | null;
  instruments_trays: string | null;
  workflow_notes: string | null;
  setup_photos: string[] | null;
};

export default function ProcedureClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const procedureId = sp.get("procedureId");
  const surgeonId = sp.get("surgeonId");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [proc, setProc] = useState<ProcedureRow | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [draping, setDraping] = useState("");
  const [instrumentsTrays, setInstrumentsTrays] = useState("");
  const [workflowNotes, setWorkflowNotes] = useState("");

  // “Scrub view” modal
  const [openSection, setOpenSection] = useState<
    null | "draping" | "instruments" | "workflow"
  >(null);

  // autoscroll controls inside modal
  const [autoScrollOn, setAutoScrollOn] = useState(true);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(18); // px/sec-ish feel
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const sectionTitle = useMemo(() => {
    if (openSection === "draping") return "Draping";
    if (openSection === "instruments") return "Instruments / Trays";
    if (openSection === "workflow") return "Workflow / Notes";
    return "";
  }, [openSection]);

  const sectionBody = useMemo(() => {
    if (!proc) return "";
    if (openSection === "draping") return proc.draping ?? "";
    if (openSection === "instruments") return proc.instruments_trays ?? "";
    if (openSection === "workflow") return proc.workflow_notes ?? "";
    return "";
  }, [openSection, proc]);

  useEffect(() => {
    if (!procedureId) {
      setLoading(false);
      return;
    }
    loadProcedure(procedureId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureId]);

  useEffect(() => {
    // reset autoscroll position when modal opens
    if (openSection && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [openSection]);

  useEffect(() => {
    // Autoscroll loop when modal open + toggle on
    if (!openSection) return;
    if (!autoScrollOn) {
      stopAutoScroll();
      return;
    }
    startAutoScroll();
    return () => stopAutoScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSection, autoScrollOn, autoScrollSpeed, sectionBody]);

  function stopAutoScroll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  }

  function startAutoScroll() {
    stopAutoScroll();

    const tick = (ts: number) => {
      if (!scrollRef.current) return;

      const last = lastTsRef.current ?? ts;
      const dt = ts - last;
      lastTsRef.current = ts;

      const el = scrollRef.current;

      // speed is "px per second" feeling
      const delta = (autoScrollSpeed * dt) / 1000;

      const maxScroll = el.scrollHeight - el.clientHeight;

      if (maxScroll <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      el.scrollTop = Math.min(maxScroll, el.scrollTop + delta);

      // if we reached bottom, loop back to top after a tiny pause
      if (el.scrollTop >= maxScroll - 1) {
        // tiny “breath”
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
        }, 700);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  async function requireSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session) {
      window.location.href = "/login";
      throw new Error("Not authenticated");
    }
    return data.session;
  }

  async function loadProcedure(id: string) {
    setLoading(true);
    setErr(null);

    try {
      const session = await requireSession();
      const userId = session.user.id;

      const { data, error } = await supabase
        .from("procedures")
        .select(
          "id, user_id, surgeon_id, name, draping, instruments_trays, workflow_notes, setup_photos"
        )
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        setProc(null);
        setLoading(false);
        return;
      }

      setProc(data as ProcedureRow);
      setName(data.name ?? "");
      setDraping(data.draping ?? "");
      setInstrumentsTrays(data.instruments_trays ?? "");
      setWorkflowNotes(data.workflow_notes ?? "");
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setProc(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveProcedure() {
    if (!procedureId) return;

    try {
      setSaving(true);
      await requireSession();

      const { error } = await supabase
        .from("procedures")
        .update({
          name: name.trim(),
          draping,
          instruments_trays: instrumentsTrays,
          workflow_notes: workflowNotes,
        })
        .eq("id", procedureId);

      if (error) throw new Error(error.message);

      await loadProcedure(procedureId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProcedure() {
    if (!procedureId) return;

    const ok = window.confirm(
      `Are you sure you want to delete this procedure?\n\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeleting(true);
      const session = await requireSession();

      const { error } = await supabase
        .from("procedures")
        .delete()
        .eq("id", procedureId)
        .eq("user_id", session.user.id);

      if (error) throw new Error(error.message);

      // go back to surgeon page
      if (surgeonId) {
        router.push(`/s?id=${surgeonId}`);
      } else {
        router.push("/");
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  function openScrub(section: "draping" | "instruments" | "workflow") {
    setOpenSection(section);
    setAutoScrollOn(true);
    setAutoScrollSpeed(18);
  }

  function closeScrub() {
    setOpenSection(null);
    stopAutoScroll();
  }

  const backHref = surgeonId ? `/s?id=${surgeonId}` : "/";

  if (!procedureId) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-transparent flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
          <button
            onClick={() => router.back()}
            className="text-white underline text-sm"
            type="button"
          >
            Back
          </button>
          <div className="mt-6 text-white font-semibold">
            Missing procedureId.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-transparent flex items-center justify-center text-sm text-white">
        Loading…
      </div>
    );
  }

  if (!proc) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-transparent flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
          <a href={backHref} className="text-white underline text-sm">
            Back
          </a>
          <div className="mt-6 text-white font-semibold">Procedure not found.</div>
          {err ? <div className="mt-2 text-sm text-red-200">Error: {err}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent flex items-start justify-center px-6 py-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <a href={backHref} className="text-white underline text-sm">
            Back
          </a>

          <button
            onClick={deleteProcedure}
            disabled={deleting}
            className="text-red-200 underline text-sm disabled:opacity-60"
            type="button"
          >
            {deleting ? "Deleting..." : "Delete procedure"}
          </button>
        </div>

        {/* Title */}
        <div className="mt-4">
          <div className="text-white text-xs font-semibold tracking-wide opacity-80">
            PROCEDURE
          </div>

          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/90 text-gray-900 placeholder:text-gray-500 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#00a9be]"
              placeholder="Procedure name"
            />

            <button
              onClick={saveProcedure}
              disabled={saving}
              className="sm:w-40 w-full rounded-lg py-2.5 font-semibold text-white bg-[#00243d] hover:opacity-95 disabled:opacity-60"
              type="button"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="mt-2 text-sm text-white/75">
            Tap the expand icon to open a “scrub view” window for quick reading in
            the room.
          </div>
        </div>

        {/* Sections */}
        <div className="mt-6 space-y-4">
          <SectionCard
            title="Draping"
            value={draping}
            onChange={setDraping}
            onExpand={() => openScrub("draping")}
            placeholder="e.g., Split sheets, Ioban, stockinette, extra towels…"
          />

          <SectionCard
            title="Instruments / Trays"
            value={instrumentsTrays}
            onChange={setInstrumentsTrays}
            onExpand={() => openScrub("instruments")}
            placeholder="e.g., Ortho set A, power, pulsed lavage, implants, peel packs…"
          />

          <SectionCard
            title="Workflow / Notes"
            value={workflowNotes}
            onChange={setWorkflowNotes}
            onExpand={() => openScrub("workflow")}
            placeholder="e.g., Time-out specifics, sequence, positioning quirks, surgeon preferences…"
          />
        </div>

        {/* Footer hint */}
        <div className="mt-8 text-center text-xs text-white/60">
          ORMastery • Keep it clear • Keep it repeatable
        </div>
      </div>

      {/* SCRUB VIEW MODAL */}
      {openSection ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white/10 border border-white/20 shadow-2xl backdrop-blur-md overflow-hidden">
            {/* modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
              <div>
                <div className="text-xs text-white/70 tracking-wide font-semibold">
                  SCRUB VIEW
                </div>
                <div className="text-white text-lg font-semibold">{sectionTitle}</div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoScrollOn((v) => !v)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20"
                  type="button"
                >
                  {autoScrollOn ? "Pause" : "Auto-scroll"}
                </button>

                <select
                  value={autoScrollSpeed}
                  onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white bg-white/10 border border-white/20 outline-none"
                >
                  <option value={10}>Slow</option>
                  <option value={18}>Normal</option>
                  <option value={28}>Fast</option>
                </select>

                <button
                  onClick={closeScrub}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white bg-[#00243d] hover:opacity-95"
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            {/* modal content */}
            <div className="p-5">
              <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                <div
                  ref={scrollRef}
                  className="max-h-[60vh] overflow-y-auto pr-2 text-white/95 text-base leading-7 whitespace-pre-wrap"
                  onMouseEnter={() => setAutoScrollOn(false)}
                  onMouseLeave={() => setAutoScrollOn(true)}
                >
                  {sectionBody?.trim()
                    ? sectionBody
                    : "No content yet. Add notes in the main page."}
                </div>
              </div>

              <div className="mt-3 text-xs text-white/60">
                Tip: Hovering over the text pauses auto-scroll. Un-hover resumes.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Reusable section card */
function SectionCard(props: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onExpand: () => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white text-sm font-semibold">{props.title}</div>
          <div className="text-white/70 text-xs mt-1">
            Keep it bullet-ish and fast to scan.
          </div>
        </div>

        <button
          onClick={props.onExpand}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20"
          type="button"
          aria-label={`Expand ${props.title}`}
          title="Scrub view"
        >
          ⤢
        </button>
      </div>

      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-3 w-full min-h-[140px] rounded-lg px-3 py-2 bg-white/90 text-gray-900 placeholder:text-gray-500 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#00a9be]"
        placeholder={props.placeholder}
      />
    </div>
  );
}