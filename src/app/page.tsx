"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Surgeon = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function Home() {
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    fetchSurgeons();
  }, []);

  async function fetchSurgeons() {
    const { data } = await supabase.from("surgeons").select("*");
    if (data) setSurgeons(data);
  }

  async function addSurgeon() {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return alert("Not logged in");

    await supabase.from("surgeons").insert({
      user_id: user.data.user.id,
      first_name: firstName,
      last_name: lastName,
    });

    setFirstName("");
    setLastName("");
    fetchSurgeons();
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">ORMastery</h1>

      <div className="mb-6">
        <input
          className="border p-2 mr-2"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          className="border p-2 mr-2"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <button
          onClick={addSurgeon}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Surgeon
        </button>
      </div>

      <ul>
        {surgeons.map((s) => (
          <li key={s.id} className="mb-2 p-3 bg-white rounded shadow">
            {s.first_name} {s.last_name}
          </li>
        ))}
      </ul>
    </div>
  );
}