import { consoles } from "@/lib/consoles";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Ubuquity</h1>
        <p className="text-[var(--muted)] mb-8">Select a UniFi console to monitor</p>
        <div className="flex flex-col gap-4">
          {consoles.map((c) => (
            <Link
              key={c.id}
              href={`/${c.id}`}
              className="block w-full px-6 py-4 rounded-xl border border-[var(--border)] text-left hover:bg-[var(--card-hover)] transition-colors"
              style={{ background: "var(--card)" }}
            >
              <div className="text-lg font-medium">{c.name}</div>
              <div className="text-sm text-[var(--muted)] mt-0.5">
                {c.id === "sopernet" ? "Home network" : "Infrastructure"}
              </div>
            </Link>
          ))}
        </div>
        <Link
          href="/admin"
          className="inline-block mt-8 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] transition-colors"
        >
          Admin →
        </Link>
      </div>
    </div>
  );
}
