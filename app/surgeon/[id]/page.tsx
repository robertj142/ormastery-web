import SurgeonClient from "./SurgeonClient";

export default function SurgeonPage({ params }: { params: { id: string } }) {
  return (
    <div style={{ padding: 16, fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: 12 }}>
        <a href="/" style={{ color: "blue" }}>
          Back
        </a>
      </div>

      {/* This proves the route is working even if client JS fails */}
      <div
        style={{
          padding: 12,
          border: "3px solid #111",
          borderRadius: 12,
          marginBottom: 16,
          background: "#f7f7f7",
          fontWeight: 700,
        }}
      >
        Surgeon Route Loaded ✅ — id: {params.id}
      </div>

      <SurgeonClient surgeonId={params.id} />
    </div>
  );
}