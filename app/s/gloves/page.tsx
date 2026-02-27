import { Suspense } from "react";
import GlovesGownClient from "./GlovesGownClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-600 bg-white">
          Loading…
        </div>
      }
    >
      <GlovesGownClient />
    </Suspense>
  );
}