export default function SurgeonPage({ params }: { params: { id: string } }) {
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>SURGEON ROUTE WORKS</h1>
      <p style={{ marginTop: 12, fontSize: 16 }}>
        Surgeon ID: <b>{params.id}</b>
      </p>
      <p style={{ marginTop: 12 }}>
        <a href="/" style={{ color: "blue" }}>
          Back to Home
        </a>
      </p>
    </div>
  );
}