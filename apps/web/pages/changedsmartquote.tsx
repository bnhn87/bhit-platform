import Link from "next/link";

function Card({
  title,
  desc,
  href,
}: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        display: "block",
        padding: 24,
        borderRadius: 18,
        border: "1px solid #1f2937",
        background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 28 }}>{title}</h2>
      <p style={{ margin: "8px 0 14px", opacity: 0.7 }}>{desc}</p>
      <span style={{ fontWeight: 700, color: "#60a5fa" }}>Proceed →</span>
    </Link>
  );
}

export default function SmartQuoteHome() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 28 }}>
      <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: 0.2, marginBottom: 12 }}>
        Welcome to SmartQuote
      </h1>
      <p style={{ opacity: 0.85, marginBottom: 24 }}>
        Your intelligent quoting assistant. Choose an option below to get started.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: 24,
        }}
      >
        <Card title="Parse Documents" desc="AI-powered extraction from text or files." href="/smartquote/parse" />
        <Card title="Manual Entry" desc="Build a quote by selecting products." href="/smartquote/manual" />
        <Card title="Quote History" desc="View your previously saved quotes." href="/smartquote/history" />
        <Card title="Admin Panel" desc="Customize application settings." href="/smartquote/admin" />
      </div>
    </div>
  );
}
