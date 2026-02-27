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

  // These are UI only for now (so we don’t break your DB).
  // When you’re ready, we can add columns and save them.
  const glovesDisplay = "—";
  const gownDisplay = "—";

  useEffect(() => {
    if (!surgeonId) {
      setLoading(false);
      return;
    }
    loadAll(surgeonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surgeonId]);

  async function getUserIdOrRedirect(): Promise<string | null> {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) {
      setErr(error.message);
      return null;
    }
    if (!sessionData.session) {
      window.location.href = "/login";
      return null;
    }
    return sessionData.session.user.id;
  }

  async function loadAll(id: string) {
    setLoading(true);
    setErr(null);

    const userId = await getUserIdOrRedirect();
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: sData, error: sErr } = await supabase
      .from("surgeons")
      .select("id, user_id, first_name, last_name, specialty, photo_url")
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

    const userId = await getUserIdOrRedirect();
    if (!userId) return;

    setAdding(true);

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
    loadAll(surgeonId);
  }

  function editGlovesGownStub() {
    alert("Next: we’ll save Gloves/Gown to the database. UI is in place.");
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
        <div className="mt-6 text-brand-dark font-semibold">Missing surgeon id.</div>
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

        <div className="mt-6 text-brand-dark font-semibold">Surgeon not found.</div>
        {err ? <div className="mt-2 text-sm text-red-600">Error: {err}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top row under global header */}
      <div className="px-6 pt-4 flex items-center justify-end">
        <button
          onClick={() => router.back()}
          className="text-brand-accent underline text-sm"
          type="button"
        >
          Back
        </button>
      </div>

      {/* Name */}
      <div className="px-6 pt-2 pb-2">
        <div className="text-4xl font-black tracking-tight text-brand-dark">
          DR.{" "}
          <span className="text-brand-accent">
            {surgeon.first_name} {surgeon.last_name}
          </span>
        </div>
      </div>

      {/* Photo + Gloves/Gown */}
      <div className="px-6 pt-6 pb-6 flex gap-10 items-center">
        <div className="flex flex-col items-center">
          {/* Outer ring */}
          <div className="h-40 w-40 rounded-full bg-brand-dark flex items-center justify-center">
            {/* Inner image circle */}
            <div className="h-[140px] w-[140px] rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
              {surgeonPhotoUrl ? (
                <img
                  src={surgeonPhotoUrl}
                  alt="Surgeon"
                  className="h-full w-full object-cover"
                />
              ) : (
                "No Photo"
              )}
            </div>
          </div>

          <label className="mt-4 text-sm text-brand-accent underline cursor-pointer">
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
            type="button"
            onClick={editGlovesGownStub}
            className="mt-2 text-sm text-brand-accent underline"
          >
            Edit Gloves/Gown
          </button>
        </div>

        <div className="flex-1">
          <div className="flex gap-14">
            <div>
              <div className="text-sm text-gray-500">Gloves</div>
              <div className="text-2xl font-semibold text-brand-dark mt-2">
                {glovesDisplay}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Gown</div>
              <div className="text-2xl font-semibold text-brand-dark mt-2">
                {gownDisplay}
              </div>
            </div>
          </div>

          {surgeon.specialty ? (
            <div className="mt-5 text-sm text-gray-600">
              Specialty: {surgeon.specialty}
            </div>
          ) : null}
        </div>
      </div>

      {/* Add procedure card */}
      <div className="px-6 pb-6">
        <div className="border rounded-2xl p-4">
          <div className="text-sm font-semibold text-brand-dark mb-3">
            Add a procedure
          </div>

          <input
            className="border p-3 rounded-xl w-full"
            placeholder='e.g., "MicroPort Knee", "rTSA – Catalyst"'
            value={newProcedureName}
            onChange={(e) => setNewProcedureName(e.target.value)}
          />

          <button
            onClick={addProcedure}
            disabled={adding}
            className="mt-4 w-full bg-brand-accent text-white py-3 rounded-xl font-semibold disabled:opacity-60"
            type="button"
          >
            {adding ? "Adding…" : "+ Add Procedure"}
          </button>
        </div>
      </div>

      {/* Procedures */}
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