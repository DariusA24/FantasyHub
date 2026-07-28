"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "../ui/button";
import { usePwaInstall } from "./usePwaInstall";

const DISMISS_KEY = "ls-install-dismissed";

export default function InstallPrompt() {
  const { canInstall, hasNativePrompt, isIos, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we read storage

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") setDismissed(true);
    else dismiss();
  };

  if (dismissed || !canInstall) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <img
          src="/icons/icon-192.png"
          alt="LeagueShelf"
          className="size-10 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install LeagueShelf</p>
          {!hasNativePrompt && isIos ? (
            <p className="text-xs text-muted-foreground">
              Tap <Share className="inline size-3 align-[-2px]" /> then{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add it to your home screen for a faster, app-like experience.
            </p>
          )}
        </div>
        {hasNativePrompt && (
          <Button size="sm" onClick={install} className="shrink-0">
            <Download className="size-4" />
            Install
          </Button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
