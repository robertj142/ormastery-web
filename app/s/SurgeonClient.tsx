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
      .select("id, user_id, first_name, last_name, specialty, photo_url, gloves, gown")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (sErr) {
      setErr(sErr.message);
      setLoading(false);
      return;
    }

    setSurgeon(sData ?? null);
    setSurgeonPhotoUrl(sData?.photo_url ?? null);

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
      <div className="min-h-screen p-6 bg-white">
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
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600 bg-white">
        Loading…
      </div>
    );
  }

  if (!surgeon) {
    return (
      <div className="min-h-screen p-6 bg-white">
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
          <div className="mt-2 text-sm text-red-600">Error: {err}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Title + Back */}
      <div className="px-6 pt-6 pb-2">
        <div className="text-3xl font-black tracking-tight text-brand-dark">
          DR.{" "}
          <span className="text-brand-accent">
            {surgeon.first_name} {surgeon.last_name}
          </span>
        </div>

        <button
          onClick={() => router.back()}
          className="mt-2 text-brand-accent underline text-sm"
          type="button"
        >
          Back
        </button>
      </div>

      {/* Photo + Gloves/Gown */}
      <div className="px-6 py-6 flex gap-6 items-center">
        <div className="flex flex-col items-center">
          {/* PHOTO AREA WITH ACCENT GRAPHIC BEHIND */}
          <div className="relative h-48 w-48 flex items-center justify-center">
            {/* Background accent goes BEHIND */}
            <img
              src="/photo-accent.png"
              alt=""
              className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none z-0"
            />

            {/* Foreground photo goes ON TOP */}
            <div className="relative z-10 h-40 w-40 rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center">
              {surgeonPhotoUrl ? (
                <img
                  src={surgeonPhotoUrl}
                  alt="Surgeon"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-sm">No Photo</span>
              )}
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

          <a
  href={`/s/gloves?id=${surgeonId}`}
  className="mt-2 text-sm text-brand-accent underline"
>
  Edit Gloves/Gown
</a>
        </div>

        <div className="flex-1">
          <div className="flex gap-10 text-lg text-gray-900">
  <div>
    <div className="text-sm text-gray-500">Gloves</div>
    <div className="font-semibold">
      {surgeon.glove_size || "—"}
    </div>
  </div>
  <div>
    <div className="text-sm text-gray-500">Gown</div>
    <div className="font-semibold">
      {surgeon.gown_size || "—"}
    </div>
  </div>
</div>

          {surgeon.specialty ? (
            <div className="mt-3 text-sm text-gray-600">
              Specialty: {surgeon.specialty}
            </div>
          ) : null}
        </div>
      </div>

      {/* Add Procedure */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 border rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-sm font-semibold text-brand-dark">
            Add a procedure
          </div>

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
            type="button"
          >
            {adding ? "Adding…" : "+ Add Procedure"}
          </button>
        </div>
      </div>

      {/* Procedures List */}
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
          <div className="text-gray-600 text-sm">
            No procedures yet. Add one above.
          </div>
        ) : null}
      </div>
    </div>
  );
}