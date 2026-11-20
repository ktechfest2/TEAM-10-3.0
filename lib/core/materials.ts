import { sha256Hex } from "./crypto";
import type { MaterialKind } from "./events";

export type MaterialItem = { kind: MaterialKind; qty: number; serialFrom?: string; serialTo?: string };

export const KIND_LABEL: Record<MaterialKind, string> = {
  ballot_papers: "Ballot papers",
  ballot_boxes: "Ballot boxes",
  result_sheets: "Result sheets (EC8A)",
  bvas: "BVAS machines",
};
export const KIND_ORDER: MaterialKind[] = ["ballot_papers", "ballot_boxes", "result_sheets", "bvas"];

export type LineState = "ok" | "short" | "over" | "waiting" | "unexpected";
export type MaterialLine = { kind: MaterialKind; label: string; sent: number | null; got: number | null; diff: number | null; state: LineState; serial?: string };
/** none: nothing signed. dispatched: sent, not yet received. ok: received and every count matches. differs: received with a different count. */
export type MaterialsState = "none" | "dispatched" | "ok" | "differs";

const serialOf = (i?: MaterialItem) => (i?.serialFrom && i?.serialTo ? `${i.serialFrom} to ${i.serialTo}` : i?.serialFrom ?? undefined);

/** Compares what was dispatched with what the officer signed for. Pure: the same two lists always give the same answer. */
export function compareMaterials(sent: MaterialItem[] | null, got: MaterialItem[] | null): { state: MaterialsState; lines: MaterialLine[] } {
  if (!sent && !got) return { state: "none", lines: [] };
  const lines: MaterialLine[] = KIND_ORDER.flatMap((kind) => {
    const s = sent?.find((i) => i.kind === kind);
    const g = got?.find((i) => i.kind === kind);
    if (!s && !g) return [];
    const diff = s && g ? g.qty - s.qty : null;
    const state: LineState = !got ? "waiting" : !s ? "unexpected" : !g ? "short" : diff! < 0 ? "short" : diff! > 0 ? "over" : "ok";
    return [{ kind, label: KIND_LABEL[kind], sent: s?.qty ?? null, got: g?.qty ?? (got ? 0 : null), diff: got ? (g?.qty ?? 0) - (s?.qty ?? 0) : null, state, serial: serialOf(g ?? s) }];
  });
  if (!got) return { state: "dispatched", lines };
  return { state: lines.every((l) => l.state === "ok") ? "ok" : "differs", lines };
}

/** The usual kit for a polling unit with this many registered voters, used only to fill in estimated test data. */
export function estimatedKit(code: string, registered: number | null): MaterialItem[] {
  const voters = registered && registered > 0 ? registered : 500;
  const papers = Math.ceil((voters * 1.05) / 50) * 50;
  const start = 100000 + (parseInt(sha256Hex(`kit:${code}`).slice(0, 5), 16) % 800000);
  return [
    { kind: "ballot_papers", qty: papers, serialFrom: String(start), serialTo: String(start + papers - 1) },
    { kind: "ballot_boxes", qty: voters > 1200 ? 2 : 1 },
    { kind: "result_sheets", qty: 8 },
    { kind: "bvas", qty: voters > 1200 ? 2 : 1 },
  ];
}

const hash = (code: string, salt: string) => parseInt(sha256Hex(`${salt}:${code}`).slice(0, 8), 16) / 0xffffffff;

/** Deterministic test outcome for a unit: most receive everything, some are short of ballot papers, a few never signed for receipt. */
export function plannedReceipt(code: string): "ok" | "short" | "none" {
  const r = hash(code, "receipt");
  return r < 0.07 ? "none" : r < 0.17 ? "short" : "ok";
}

export function shortenedKit(code: string, kit: MaterialItem[]): MaterialItem[] {
  const cut = 20 + Math.floor(hash(code, "cut") * 80);
  return kit.map((i) => (i.kind === "ballot_papers" ? { ...i, qty: Math.max(0, i.qty - cut) } : i));
}
