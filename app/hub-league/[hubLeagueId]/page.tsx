"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeagueNav } from "./LeagueNav";

type HubLeague = {
  id: string;
  name: string;
  description?: string | null;
  // add more fields as needed
};

export default function HubLeaguePage() {
  const { hubLeagueId } = useParams<{ hubLeagueId: string }>();
  const router = useRouter();
  const [hubLeague, setHubLeague] = useState<HubLeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!hubLeagueId) return;

    const loadHubLeague = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hub-leagues/${hubLeagueId}`);

        if (res.status === 401) {
          setError("You must be signed in to view this hub league.");
          return;
        }

        if (res.status === 403) {
          setError("You are not invited to this hub league.");
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          setError(text || `Failed to load hub league`);
          return;
        }

        const data = await res.json();
        setHubLeague(data.hubLeague ?? null);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error loading hub league");
      } finally {
        setLoading(false);
      }
    };

    loadHubLeague();
  }, [hubLeagueId]);

  const handleDelete = async () => {
    if (!hubLeagueId || deleting) return;
    if (!confirm("Are you sure you want to delete this hub league? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/hub-leagues/${hubLeagueId}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        setError("You must be signed in to delete this hub league.");
        return;
      }

      if (res.status === 403) {
        setError("Only the owner can delete this hub league.");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to delete hub league.");
        return;
      }

      // On success, navigate back or to a safe page
      router.push("/"); // or `/league` or wherever makes sense
    } catch (e: any) {
      setError(e?.message ?? "Unknown error deleting hub league");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-zinc-200">
        <p>Loading hub league…</p>
      </div>
    );
  }

  if (error || !hubLeague) {
    return (
      <div className="p-6 text-zinc-200">
        <p className="text-red-400 mb-2">{error ?? "Hub league not found."}</p>
        <button
          className="text-sm text-blue-400 hover:underline"
          onClick={() => router.back()}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 text-zinc-200">
     <LeagueNav />
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-[#F4D06F]">
            {hubLeague.name}
          </h1>
          {hubLeague.description && (
            <p className="mb-2 text-sm text-zinc-300">{hubLeague.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-3 py-1 rounded-md border border-red-500 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete Hub League"}
        </button>
      </div>

      {/* Add rest of hub league UI here: posts, history, etc. */}
      <p className="text-xs text-zinc-500">
        Hub League ID: <span className="font-mono">{hubLeague.id}</span>
      </p>
    </div>
  );
}
