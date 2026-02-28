"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Surgeon = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  photo_url: string | null;
  gloves?: string | null;
  gown?: string | null;
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

  // Loading / Error states should also be transparent (layout handles background)
  if (!surgeonId) {
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
          <div className="mt-6 text-white font-semibold">Missing surgeon id.</div>
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

  if (!surgeon) {
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

          <div className="mt-6 text-white font-semibold">Surgeon not found.</div>
          {err ? (
            <div className="mt-2 text-sm text-red-200">Error: {err}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    // Transparent page, centered “glass” card like login screen
    <div className="min-h-[calc(100vh-72px)] bg-transparent flex items-start justify-center px-6 py-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md p-6">
        {/* Top row: Back left, Delete right */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-white underline text-sm"
            type="button"
          >
            Back
          </button>

          <button
            onClick={deleteSurgeon}
            disabled={deletingSurgeon}
            className="text-red-200 underline text-sm disabled:opacity-60"
            type="button"
          >
            {deletingSurgeon ? "Deleting..." : "Delete surgeon"}
          </button>
        </div>

        {/* Name */}
        <div className="mt-4">
          <div className="text-white text-xs font-semibold tracking-wide opacity-80">
            SURGEON PROFILE
          </div>

          <div className="mt-1 text-3xl font-black tracking-tight text-white">
            DR.{" "}
            <span className="text-[#00243d]">
              {surgeon.first_name} {surgeon.last_name}
            </span>
          </div>

          {surgeon.specialty ? (
            <div className="mt-2 text-sm text-white/80">
              Specialty: {surgeon.specialty}
            </div>
          ) : null}
        </div>

        {/* Photo + details */}
        <div className="mt-6 flex flex-col sm:flex-row gap-6 sm:items-center">
          <div className="flex flex-col items-center sm:items-start">
            {/* Photo stack */}
            <div className="relative h-44 w-44">
              {/* Background accent graphic */}
              <img
                src="/photo-accent.png"
                alt=""
                className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none opacity-90"
              />

              {/* Surgeon photo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-full overflow-hidden bg-white/20">
                  {surgeonPhotoUrl ? (
                    <img
                      src={surgeonPhotoUrl}
                      alt="Surgeon"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/80 text-sm">
                      No Photo
                    </div>
                  )}
                </div>
              </div>
            </div>

            <label className="mt-3 text-sm text-white underline cursor-pointer">
              {uploadingPhoto ? "Uploading..." : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
            </label>

            <a
              className="mt-2 text-sm text-white underline"
              href={`/s/gloves?surgeonId=${surgeonId}`}
            >
              Edit gloves and gown
            </a>
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                <div className="text-xs text-white/70">Gloves</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {surgeon.gloves ?? "—"}
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                <div className="text-xs text-white/70">Gown</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {surgeon.gown ?? "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4 text-white/80 text-sm">
              Quick tip: Keep glove and gown sizes updated so anyone jumping into
              the room can set up fast.
            </div>
          </div>
        </div>

        {/* Add procedure */}
        <div className="mt-8">
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
            <div className="text-sm font-semibold text-white">Add a procedure</div>

            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <input
                className="w-full rounded-lg px-3 py-2 bg-white/90 text-gray-900 placeholder:text-gray-500 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-[#00a9be]"
                placeholder='e.g., "MicroPort Knee", "rTSA – Catalyst"'
                value={newProcedureName}
                onChange={(e) => setNewProcedureName(e.target.value)}
              />

              <button
                onClick={addProcedure}
                disabled={adding}
                className="sm:w-48 w-full rounded-lg py-2.5 font-semibold text-white bg-[#00243d] hover:opacity-95 disabled:opacity-60"
                type="button"
              >
                {adding ? "Adding..." : "+ Add"}
              </button>
            </div>
          </div>
        </div>

        {/* Procedures */}
        <div className="mt-8 space-y-3">
          <div className="text-white text-sm font-semibold">Procedures</div>

          {procedures.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-white/10 border border-white/20 p-4 flex items-center justify-between gap-4"
            >
              <a
                href={`/procedure?procedureId=${p.id}&surgeonId=${surgeonId}`}
                className="text-white font-semibold hover:underline"
              >
                {p.name}
              </a>

              <button
                onClick={() => deleteProcedure(p.id, p.name)}
                disabled={deletingProcedureId === p.id}
                className="text-sm text-red-200 underline disabled:opacity-60"
                type="button"
              >
                {deletingProcedureId === p.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}

          {procedures.length === 0 ? (
            <div className="text-white/80 text-sm rounded-xl bg-white/5 border border-white/10 p-4">
              No procedures yet. Add one above.
            </div>
          ) : null}
        </div>

        <div className="mt-8 text-center text-xs text-white/60">
          ORMastery • Organized setup • Fewer surprises
        </div>
      </div>
    </div>
  );
}