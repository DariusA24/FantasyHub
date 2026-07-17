// Per-browser tool usage counts, used to order the dashboard's Quick Tools
// strip by frequency. Same localStorage approach as recentHubLeague.

const STORAGE_KEY = "toolUsage";

export type ToolUsage = Record<string, number>;

export function getToolUsage(): ToolUsage {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function recordToolVisit(href: string): void {
  if (typeof window === "undefined") return;
  try {
    const usage = getToolUsage();
    usage[href] = (usage[href] ?? 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {}
}
