import { Suspense } from "react";
import SurgeonClient from "./SurgeonClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-600 bg-white/10">
          Loading…
        </div>
      }
    >
      <SurgeonClient />
    </Suspense>
  );
}
