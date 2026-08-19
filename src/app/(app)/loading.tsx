import { MobilePageSkeleton } from "@/components/mobile-page-skeleton";

export default function AppLoading() {
  return (
    <>
      <div className="lg:hidden">
        <MobilePageSkeleton />
      </div>
      <div className="hidden lg:flex" style={{ flexDirection: "column", gap: 16, padding: 4 }}>
        <div style={{ height: 32, width: 200, borderRadius: 10, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: 14, width: 320, borderRadius: 6, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: "0.1s" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 72, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <div style={{ height: 280, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", marginTop: 4, animation: "pulse 1.5s ease-in-out infinite", animationDelay: "0.3s" }} />
      </div>
    </>
  );
}
