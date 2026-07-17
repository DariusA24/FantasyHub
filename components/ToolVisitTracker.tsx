"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordToolVisit } from "@/lib/toolUsage";

// Mounted from app/tools/layout.tsx so every tool page (including nested
// routes like /tools/scouting/prospect/[id]) counts toward its tool.
export default function ToolVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "tools" && segments[1]) {
      recordToolVisit(`/tools/${segments[1]}`);
    }
  }, [pathname]);

  return null;
}
