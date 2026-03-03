"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Surgeon = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  photo_url: string | null;
  gloves: string | null;
  gown: string | null;
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

  const [surgeonPhotoUrl, setSurgeonPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [newProcedureName, setNewProcedureName] = useState("");
  const [adding, setAdding] = useState(false);

  const [deletingSurgeon, setDeletingSurgeon] = useState(false);
  const [deletingProcedureId, setDeletingProcedureId] = useState<string | null>(
    null
  );

  // Gloves/Gown modal state
  const [showGGModal, setShowGGModal] = useState(false);
  const [glovesDraft, setGlovesDraft] = useState("");
  const [gownDraft, setGownDraft] = useState("");
  const [savingGG, setSavingGG] = useState(false);

  useEffect(() => {
    if (!surgeonId) {
      setLoading(false);
      return;
    }
    loadAll(surgeonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surgeonId]);

  async function requireSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session) {
      window.location.href = "/login";
      throw new Error("Not authenticated");
    }
    return data.session;
  }

  async function loadAll(id: string) {
    setLoading(true);
    setErr(null);

    try {
      const session = await requireSession();
      const userId = session.user.id;

      const { data: sData, error: sErr } = await supabase
        .from("surgeons")
        .select(
          "id, user_id, first_name, last_name, specialty, photo_url, gloves, gown"
        )
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (sErr) throw new Error(sErr.message);

      setSurgeon(sData ?? null);
      setSurgeonPhotoUrl(sData?.photo_url ?? null);

      // keep modal drafts in sync with current values
      setGlovesDraft(sData?.gloves ?? "");
      setGownDraft(sData?.gown ?? "");

      const { data: pData, error: pErr } = await supabase
        .from("procedures")
        .select("id, name")
        .eq("surgeon_id", id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (pErr) throw new Error(pErr.message);

      setProcedures(pData ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setProcedures([]);
      setSurgeon(null);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!surgeonId) return;
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];

      if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        return;
      }

      setUploadingPhoto(true);
      await requireSession();

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${surgeonId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("surgeon-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        alert(uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("surgeon-photos")
        .getPublicUrl(fileName);

      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("surgeons")
        .update({ photo_url: publicUrl })
        .eq("id", surgeonId);

      if (updateError) {
        alert(updateError.message);
        return;
      }

      setSurgeonPhotoUrl(publicUrl);
      setSurgeon((prev) => (prev ? { ...prev, photo_url: publicUrl } : prev));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function addProcedure() {
    const name = newProcedureName.trim();
    if (!name) return alert("Enter a procedure name.");
    if (!surgeonId) return;

    try {
      const session = await requireSession();
      setAdding(true);

      const { error } = await supabase.from("procedures").insert({
        user_id: session.user.id,
        surgeon_id: surgeonId,
        name,
        draping: "",
        instruments_trays: "",
        workflow_notes: "",
      });

      if (error) throw new Error(error.message);

      setNewProcedureName("");
      loadAll(surgeonId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to add procedure");
    } finally {
      setAdding(false);
    }
  }

  async function deleteProcedure(procId: string, procName: string) {
    const ok = window.confirm(
      `Are you sure you want to delete "${procName}"?\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeletingProcedureId(procId);
      const session = await requireSession();

      const { error } = await supabase
        .from("procedures")
        .delete()
        .eq("id", procId)
        .eq("user_id", session.user.id);

      if (error) throw new Error(error.message);

      setProcedures((prev) => prev.filter((p) => p.id !== procId));
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete procedure");
    } finally {
      setDeletingProcedureId(null);
    }
  }

  async function deleteSurgeon() {
    if (!surgeonId || !surgeon) return;

    const ok = window.confirm(
      `Are you sure you want to delete Dr. ${surgeon.first_name} ${surgeon.last_name}?\n\nThis will also delete ALL procedures for this surgeon.`
    );
    if (!ok) return;

    try {
      setDeletingSurgeon(true);
      const session = await requireSession();

      const { error: delProcsErr } = await supabase
        .from("procedures")
        .delete()
        .eq("surgeon_id", surgeonId)
        .eq("user_id", session.user.id);

      if (delProcsErr) throw new Error(delProcsErr.message);

      const { error: delSurgeonErr } = await supabase
        .from("surgeons")
        .delete()
        .eq("id", surgeonId)
        .eq("user_id", session.user.id);

      if (delSurgeonErr) throw new Error(delSurgeonErr.message);

      router.push("/");
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete surgeon");
    } finally {
      setDeletingSurgeon(false);
    }
  }

  async function saveGlovesGown() {
    if (!surgeonId) return;

    try {
      setSavingGG(true);
      const session = await requireSession();

      const glovesVal = glovesDraft.trim();
      const gownVal = gownDraft.trim();

      const { error } = await supabase
        .from("surgeons")
        .update({
          gloves: glovesVal || null,
          gown: gownVal || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", surgeonId)
        .eq("user_id", session.user.id);

      if (error) throw new Error(error.message);

      setSurgeon((prev) =>
        prev
          ? {
              ...prev,
              gloves: glovesVal || null,
              gown: gownVal || null,
            }
          : prev
      );

      setShowGGModal(false);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save gloves/gown");
    } finally {
      setSavingGG(false);
    }
  }

  if (!surgeonId) {
    return (
      <div className="min-h-screen p-6">
        <button
          onClick={() => router.back()}
          className="text-brand-accent underline text-sm"
          type="button"
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
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-100">
        Loading…
      </div>
    );
  }

  if (!surgeon) {
    return (
      <div className="min-h-screen p-6">
        <button
          onClick={() => router.back()}
          className="text-brand-accent underline text-sm"
          type="button"
        >
          Back
        </button>

        <div className="mt-6 text-brand-dark font-semibold">
          Surgeon not found.
        </div>
        {err ? (
          <div className="mt-2 text-sm text-red-300">Error: {err}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-brand-accent underline text-sm"
          type="button"
        >
          Back
        </button>

        <button
          onClick={deleteSurgeon}
          disabled={deletingSurgeon}
          className="text-red-300 underline text-sm disabled:opacity-60"
          type="button"
        >
          {deletingSurgeon ? "Deleting..." : "Delete surgeon"}
        </button>
      </div>

      {/* Main card (same vibe as login screen box) */}
      <div className="mt-6 bg-white/10 border border-white/15 rounded-2xl shadow-xl p-6">
        {/* Name */}
        <div className="text-3xl font-black tracking-tight text-brand-dark">
          DR.{" "}
          <span className="text-brand-accent">
            {surgeon.first_name} {surgeon.last_name}
          </span>
        </div>

        {/* Photo + details */}
        <div className="mt-6 flex flex-col sm:flex-row gap-8 items-start sm:items-center">
          <div className="flex flex-col items-center">
            <div className="relative h-44 w-44">
              {/* Accent image behind */}
              <img
                src="/photo-accent.png"
                alt=""
                className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none"
              />

              {/* Photo on top */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-full overflow-hidden bg-white/10 border border-white/15">
                  {surgeonPhotoUrl ? (
                    <img
                      src={surgeonPhotoUrl}
                      alt="Surgeon"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/70 text-sm">
                      No Photo
                    </div>
                  )}
                </div>
              </div>
            </div>

            <label className="mt-3 text-sm text-brand-accent underline cursor-pointer">
              {uploadingPhoto ? "Uploading..." : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
            </label>

            <button
              onClick={() => {
                setGlovesDraft(surgeon.gloves ?? "");
                setGownDraft(surgeon.gown ?? "");
                setShowGGModal(true);
              }}
              className="mt-2 text-sm text-brand-accent underline"
              type="button"
            >
              Edit Gloves/Gown
            </button>
          </div>

          <div className="flex-1 w-full">
            <div className="flex gap-10 text-lg text-white">
              <div>
                <div className="text-sm text-white/70">Gloves</div>
                <div className="font-semibold">
                  {surgeon.gloves ? surgeon.gloves : "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-white/70">Gown</div>
                <div className="font-semibold">
                  {surgeon.gown ? surgeon.gown : "—"}
                </div>
              </div>
            </div>

            {surgeon.specialty ? (
              <div className="mt-3 text-sm text-white/70">
                Specialty: {surgeon.specialty}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add procedure card */}
      <div className="mt-6 bg-white/10 border border-white/15 rounded-2xl shadow-xl p-6">
        <div className="text-sm font-semibold text-white/90 mb-3">
          Add a procedure
        </div>

        <input
          className="w-full border border-white/20 bg-white/10 text-white rounded-xl p-3 outline-none"
          placeholder='e.g., "MicroPort Knee", "rTSA – Catalyst"'
          value={newProcedureName}
          onChange={(e) => setNewProcedureName(e.target.value)}
        />

        <button
          onClick={addProcedure}
          disabled={adding}
          className="mt-3 w-full bg-brand-accent text-white py-3 rounded-xl font-semibold disabled:opacity-60"
          type="button"
        >
          {adding ? "Adding…" : "+ Add Procedure"}
        </button>
      </div>

      {/* Procedures list */}
      <div className="mt-6 space-y-4 pb-10">
        {procedures.map((p) => (
          <div
            key={p.id}
            className="relative bg-white/10 border border-white/15 rounded-2xl shadow-xl overflow-hidden"
          >
            <a
              href={`/procedure?procedureId=${p.id}&surgeonId=${surgeonId}`}
              className="block px-6 py-8 text-2xl sm:text-3xl font-semibold text-white text-center"
            >
              {p.name}
            </a>

            <button
              onClick={() => deleteProcedure(p.id, p.name)}
              disabled={deletingProcedureId === p.id}
              className="absolute right-4 top-4 text-sm text-red-300 underline disabled:opacity-60"
              type="button"
            >
              {deletingProcedureId === p.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}

        {procedures.length === 0 ? (
          <div className="text-white/70 text-sm">
            No procedures yet. Add one above.
          </div>
        ) : null}
      </div>

      {/* Gloves/Gown Modal */}
      {showGGModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
          onClick={() => setShowGGModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white/10 border border-white/15 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold text-white">
              Gloves & Gown
            </div>
            <div className="mt-1 text-sm text-white/70">
              Dr. {surgeon.first_name} {surgeon.last_name}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-sm text-white/80 mb-2">Glove size</div>
                <input
                  className="w-full border border-white/20 bg-white/10 text-white rounded-xl p-3 outline-none"
                  placeholder="e.g., 7, 7.5, 8"
                  value={glovesDraft}
                  onChange={(e) => setGlovesDraft(e.target.value)}
                />
              </div>

              <div>
                <div className="text-sm text-white/80 mb-2">Gown size</div>
                <input
                  className="w-full border border-white/20 bg-white/10 text-white rounded-xl p-3 outline-none"
                  placeholder="e.g., M, L, XL"
                  value={gownDraft}
                  onChange={(e) => setGownDraft(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowGGModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white/80"
                type="button"
                disabled={savingGG}
              >
                Cancel
              </button>

              <button
                onClick={saveGlovesGown}
                className="flex-1 py-3 rounded-xl bg-brand-accent text-white font-semibold disabled:opacity-60"
                type="button"
                disabled={savingGG}
              >
                {savingGG ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}