"use client";
import { useEffect, useState } from "react";
import type { CellStatus } from "@/lib/server/mission";
import { TerritoryMap, type Geometry } from "@/components/territory-map";

/** The map geometry is a cached download shared with mission control, not part of every page. */
export function ReplayMap({ cells, label }: { cells: CellStatus[]; label: string }) {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void fetch("/api/map").then((r) => r.json()).then(setGeo).catch(() => setFailed(true));
  }, []);
  if (failed) return <p className="p-6 text-sm text-muted">The map could not load. The list below is complete.</p>;
  if (!geo) return <div className="aspect-[4/3] animate-pulse rounded-2xl bg-raised" aria-label="Loading map" />;
  return <TerritoryMap geometry={geo} cells={cells} focus={null} label={label} />;
}
