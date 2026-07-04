export interface ConsoleConfig {
  id: string;
  name: string;
  apiKey: string;
  consoleId: string;
  site: string;
}

const apiKey = process.env.UNIFI_API_KEY || "";
export const defaultConsoleId = process.env.DEFAULT_CONSOLE_ID || "sopernet";

export const consoles: ConsoleConfig[] = [
  {
    id: "sopernet",
    name: "SoperNet",
    apiKey,
    consoleId: process.env.UNIFI_CONSOLE_ID || "",
    site: process.env.UNIFI_SITE || "default",
  },
  {
    id: "databunker1",
    name: "Databunker1",
    apiKey,
    consoleId: process.env.UNIFI_CONSOLE_ID_2 || "",
    site: process.env.UNIFI_SITE_2 || "default",
  },
];

export function getConsole(id: string): ConsoleConfig | undefined {
  return consoles.find((c) => c.id === id);
}

export function getDefaultConsole(): ConsoleConfig {
  return getConsole(defaultConsoleId) || consoles[0];
}
