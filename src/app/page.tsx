import { DashboardView } from "@/components/DashboardView";
import { consoles, getDefaultConsole } from "@/lib/consoles";

export default function SoperNetPage() {
  const primary = getDefaultConsole();
  const other = consoles.find((c) => c.id !== primary.id) || primary;
  return (
    <DashboardView
      consoleId={primary.id}
      consoleName={primary.name}
      otherConsoleId={other.id}
      otherConsoleName={other.name}
    />
  );
}
