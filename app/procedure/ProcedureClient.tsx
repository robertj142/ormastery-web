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

type Photo = {
  id: string;
  url: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
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

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  // Photo viewer
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Autoscroll (iPhone-safe)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [autoScrollOn, setAutoScrollOn] = useState(true);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(22); // px/sec

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

  const activePhoto = useMemo(() => {
    if (viewerIndex === null) return null;
    if (viewerIndex < 0 || viewerIndex >= photos.length) return null;
    return photos[viewerIndex];
  }, [viewerIndex, photos]);

  useEffect(() => {
    if (!procedureId) {
      setLoading(false);
      return;
    }
    loadAll();
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

  async function loadAll() {
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

      await loadPhotos(userId);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setProc(null);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPhotos(userId: string) {
    const { data, error } = await supabase
      .from("procedure_photos")
      .select("id, url, storage_path, caption, created_at")
      .eq("procedure_id", procedureId!)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    setPhotos((data as Photo[]) ?? []);
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

      carryRef.current += (autoScrollSpeed * dt) / 1000;
      const step = Math.floor(carryRef.current);

      if (step >= 1) {
        carryRef.current -= step;

        const next = node.scrollTop + step;

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

  // Close photo viewer with ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (viewerIndex === null) return;
      if (e.key === "Escape") setViewerIndex(null);
      if (e.key === "ArrowRight") setViewerIndex((i) => (i === null ? null : Math.min(i + 1, photos.length - 1)));
      if (e.key === "ArrowLeft") setViewerIndex((i) => (i === null ? null : Math.max(i - 1, 0)));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerIndex, photos.length]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!procedureId) return;
      if (!e.target.files || e.target.files.length === 0) return;

      const session = await requireSession();
      const userId = session.user.id;

      const files = Array.from(e.target.files);

      for (const f of files) {
        if (!f.type.startsWith("image/")) {
          alert("Only image files are allowed.");
          return;
        }
      }

      setUploadingPhotos(true);

      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uuid =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const storagePath = `${userId}/${procedureId}/${uuid}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("procedure-photos")
          .upload(storagePath, file, { upsert: false });

        if (uploadError) {
          alert(uploadError.message);
          return;
        }

        const { data: publicData } = supabase.storage
          .from("procedure-photos")
          .getPublicUrl(storagePath);

        const publicUrl = publicData.publicUrl;

        const { error: rowErr } = await supabase.from("procedure_photos").insert({
          user_id: userId,
          procedure_id: procedureId,
          url: publicUrl,
          storage_path: storagePath,
          caption: null,
        });

        if (rowErr) {
          alert(rowErr.message);
          return;
        }
      }

      await loadPhotos(userId);
    } catch (e: any) {
      alert(e?.message ?? "Upload failed");
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  }

  async function deletePhoto(photo: Photo) {
    const ok = window.confirm("Delete this photo? This cannot be undone.");
    if (!ok) return;

    try {
      setDeletingPhotoId(photo.id);
      const session = await requireSession();
      const userId = session.user.id;

      const looksLikeUrl =
        photo.storage_path.startsWith("http://") ||
        photo.storage_path.startsWith("https://");

      if (!looksLikeUrl) {
        const { error: storageErr } = await supabase.storage
          .from("procedure-photos")
          .remove([photo.storage_path]);

        if (storageErr) throw new Error(storageErr.message);
      }

      const { error: rowErr } = await supabase
        .from("procedure_photos")
        .delete()
        .eq("id", photo.id)
        .eq("user_id", userId);

      if (rowErr) throw new Error(rowErr.message);

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      // if viewer was open, close it if we deleted the active photo
      setViewerIndex((idx) => {
        if (idx === null) return null;
        const deletedIdx = photos.findIndex((x) => x.id === photo.id);
        if (deletedIdx === -1) return idx;
        if (idx === deletedIdx) return null;
        // shift index if needed
        return idx > deletedIdx ? idx - 1 : idx;
      });
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  if (!procedureId) {
    return (
      <div className="min-h-screen p-6">
        import BackButton from "../../components/BackButton";
	
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
       import BackButton from "../../components/BackButton";
       
        <div className="mt-6 font-semibold text-white">Procedure not found.</div>
        {err ? <div className="mt-2 text-sm text-red-200">Error: {err}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
       import BackButton from "../../components/BackButton";
	

        <button
          onClick={save}
          disabled={saving}
          className="bg-brand-accent text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
          type="button"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="bg-white/10 backdrop-blur rounded-3xl border border-white/15 shadow-2xl p-6">
          <div className="text-2xl font-black text-white mb-6">{proc.name}</div>

          <div className="space-y-6">
            <SectionBox title="Draping" onExpand={() => setOpenSection("draping")}>
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

            <SectionBox title="Workflow / Notes" onExpand={() => setOpenSection("workflow")}>
              <textarea
                className="w-full rounded-2xl p-4 min-h-[160px] bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/40"
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value)}
                placeholder="Workflow notes..."
              />
            </SectionBox>

            <SectionBox title="Setup Photos">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold cursor-pointer">
                  {uploadingPhotos ? "Uploading..." : "+ Add photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhotos}
                  />
                </label>

                <div className="text-sm text-white/70">
                  {photos.length} photo{photos.length === 1 ? "" : "s"}
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="mt-4 text-sm text-white/70">No setup photos yet.</div>
              ) : (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((p, idx) => (
                    <div
                      key={p.id}
                      className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5"
                    >
                      <button
                        type="button"
                        onClick={() => setViewerIndex(idx)}
                        className="block w-full"
                        aria-label="Open photo"
                      >
                        <img
                          src={p.url}
                          alt="Setup photo"
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                      </button>

                      <button
                        onClick={() => deletePhoto(p)}
                        disabled={deletingPhotoId === p.id}
                        className="absolute top-2 right-2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold disabled:opacity-60"
                        type="button"
                      >
                        {deletingPhotoId === p.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionBox>
          </div>
        </div>
      </div>

      {/* Expand text modal */}
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

      {/* Photo viewer modal */}
      {viewerIndex !== null && activePhoto ? (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewerIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/80 text-sm font-semibold">
                Photo {viewerIndex + 1} of {photos.length}
              </div>

              <button
                className="text-white underline text-sm"
                type="button"
                onClick={() => setViewerIndex(null)}
              >
                Close
              </button>
            </div>

            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black">
              <img
                src={activePhoto.url}
                alt="Large setup photo"
                className="w-full max-h-[75vh] object-contain bg-black"
              />

              <button
                type="button"
                onClick={() => setViewerIndex((i) => (i === null ? null : Math.max(i - 1, 0)))}
                disabled={viewerIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 px-4 py-3 rounded-2xl bg-black/60 text-white font-semibold disabled:opacity-40"
              >
                Prev
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewerIndex((i) =>
                    i === null ? null : Math.min(i + 1, photos.length - 1)
                  )
                }
                disabled={viewerIndex === photos.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-3 rounded-2xl bg-black/60 text-white font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>

            {activePhoto.caption ? (
              <div className="mt-3 text-white/80 text-sm">{activePhoto.caption}</div>
            ) : null}
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