import { Suspense } from "react";
import ProcedureClient from "./ProcedureClient";

export default function ProcedurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-600">Loading…</div>}>
      <ProcedureClient />
    </Suspense>
  );
}