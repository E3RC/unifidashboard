import { DashboardView } from "@/components/DashboardView";
import { consoles } from "@/lib/consoles";

export default function Databunker1Page() {
  const primary = consoles[1];
  const other = consoles[0];
  return (
    <DashboardView
      consoleId={primary.id}
      consoleName={primary.name}
      otherConsoleId={other.id}
      otherConsoleName={other.name}
      otherConsoleHref="/"
      otherLinks={[{ label: "BunkerBox", href: "/databunker1/bunkerbox" }]}
    />
  );
}
