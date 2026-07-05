import { DashboardView } from "@/components/DashboardView";
import { consoles } from "@/lib/consoles";

export default function SoperNetPage() {
  const primary = consoles[0];
  const other = consoles[1];
  return (
    <DashboardView
      consoleId={primary.id}
      consoleName={primary.name}
      otherConsoleId={other.id}
      otherConsoleName={other.name}
    />
  );
}
