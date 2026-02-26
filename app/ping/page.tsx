export default function Ping() {
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>PING OK</h1>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}