import { Suspense } from "react";
import SurgeonClient from "./SurgeonClient";

export default function SPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <SurgeonClient />
    </Suspense>
  );
}