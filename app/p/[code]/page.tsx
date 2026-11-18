import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Eyebrow, FiguresTable, StatusBadge, TrustMeter, shortHash, type Status } from "@/components/ui";
import {
  childSummaries,
  getBreadcrumb,
  getChildren,
  getCollationCheck,
  getCoverage,
  getPlace,
  getTimeline,
  getUnitResults,
  type CollationCheck,
  type Place,
} from "@/lib/server/views";

export const dynamic = "force-dynamic";

const LEVEL: Record<Place["level"], string> = { national: "Country", state: "State", lga: "Area council", ward: "Ward", pu: "Polling unit" };
const ROLE: Record<string, string> = { presiding_officer: "Presiding officer", party_agent: "Party agent", observer: "Observer", citizen: "Citizen", community_leader: "Community leader", collation_officer: "Collation officer" };
const EVENT: Record<string, string> = {
  "pu.opened": "Polling unit opened",
  "pu.closed": "Polling unit closed",
  "pu.queue": "Queue reported",
  "result.declared": "Result recorded (EC8A)",
  "transmission.attempted": "IReV upload attempt",
  "collation.entered": "Collation entered",
  "material.received": "Materials received",
  "material.dispatched": "Materials dispatched",
  "staff.checked_in": "Staff checked in",
  "incident.reported": "Incident reported",
  "cancellation.recorded": "Cancellation recorded",
};

export async function generateMetadata(props: PageProps<"/p/[code]">): Promise<Metadata> {
  const { code } = await props.params;
  const place = await getPlace(code);
  return { title: place ? place.name : "Not found" };
}

export default async function PlacePage(props: PageProps<"/p/[code]">) {
  const { code } = await props.params;
  const place = await getPlace(code);
  if (!place) notFound();

  const [breadcrumb, children, results, timeline] = await Promise.all([getBreadcrumb(place), getChildren(code), getUnitResults(place), getTimeline(place)]);
  const [coverage, collation] = await Promise.all([getCoverage(place, results), getCollationCheck(place, results)]);
  const unit = place.level === "pu" ? results.get(code) : undefined;
  const inclusion = place.level === "pu" ? await inclusionChecks(place, breadcrumb) : [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-lg font-black tracking-tight">Tally</Link>
        <Link href="/app" className="text-sm font-semibold text-accent">Open app ›</Link>
      </header>

      <nav className="flex flex-wrap gap-1 text-xs text-muted" aria-label="Breadcrumb">
        {breadcrumb.map((b) => (
          <span key={b.code}>
            <Link href={`/p/${b.code}`} className="hover:text-ink hover:underline">{b.name}</Link> ›
          </span>
        ))}
      </nav>
      <h1 className="mt-1 text-3xl font-bold">{place.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {LEVEL[place.level]} · <span className="hash">{place.code}</span>
        {place.registered ? ` · ${place.registered.toLocaleString()} registered voters` : ""}
      </p>

      <div className="mt-6 space-y-4">
        {place.level === "pu" ? (
          unit?.best ? (
            <>
              <Card className={unit.best.trust.status === "disputed" ? "border-disputed" : unit.best.trust.status === "sealed" ? "border-sealed" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Eyebrow>Result</Eyebrow>
                    <p className="mt-2 text-lg font-semibold">{unit.best.trust.verdict}</p>
                  </div>
                  <StatusBadge status={unit.best.trust.status} />
                </div>
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  <FiguresTable totals={unit.best.figures} />
                  <div className="space-y-4">
                    <TrustMeter probability={unit.best.trust.probability} status={unit.best.trust.status} />
                    <div>
                      <Eyebrow>Signed by</Eyebrow>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {unit.best.witnesses.map((w) => (
                          <li key={w.actorId} className="flex justify-between gap-2">
                            <span>
                              {w.party ? <span className="font-semibold">{w.party} </span> : null}
                              {ROLE[w.role] ?? w.role}
                            </span>
                            <span className="text-muted">{new Date(w.signedAt).toLocaleTimeString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer font-semibold">Why this trust score</summary>
                  <ul className="mt-2 space-y-1">
                    {unit.best.trust.trace.map((t) => (
                      <li key={t.id + t.label} className="flex justify-between gap-3">
                        <span>{t.label} <span className="text-muted">· {t.detail}</span></span>
                        <span className={t.effect >= 0 ? "text-sealed" : "text-disputed"}>{t.effect >= 0 ? "+" : ""}{t.effect.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
                <div className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
                  <p>Read by: {unit.best.readBy === "model" ? "AI reader, confirmed by the officer" : "entered by the officer"}</p>
                  <p>Content hash <span className="hash text-ink">{unit.best.contentHash}</span></p>
                  {unit.best.photoSha256 && (
                    <p>
                      EC8A photo <a className="text-accent underline" href={`/api/media/${unit.best.photoSha256}`}>view</a> · fingerprint <span className="hash">{shortHash(unit.best.photoSha256)}</span>
                    </p>
                  )}
                </div>
              </Card>
              {unit.versions.length > 1 && (
                <Card className="border-disputed">
                  <Eyebrow>Other signed versions</Eyebrow>
                  <p className="mt-1 text-sm text-muted">Every version stays on the ledger as evidence. Nothing is overwritten.</p>
                  {unit.versions
                    .filter((v) => v.contentHash !== unit.best!.contentHash)
                    .map((v) => (
                      <div key={v.contentHash} className="mt-3 rounded-xl bg-paper p-3">
                        <div className="flex justify-between text-sm">
                          <span>{v.witnesses.filter((w) => w.party).map((w) => w.party).join(", ") || "Officer only"}</span>
                          <StatusBadge status={v.trust.status} />
                        </div>
                        <div className="mt-2">
                          <FiguresTable totals={v.figures} compare={unit.best!.figures} />
                        </div>
                      </div>
                    ))}
                </Card>
              )}
              {inclusion.length > 0 && (
                <Card>
                  <Eyebrow>Is what was on the wall what was counted?</Eyebrow>
                  <ul className="mt-3 space-y-2">
                    {inclusion.map((i) => (
                      <li key={i.place.code} className="flex items-center justify-between gap-2 text-sm">
                        <span>{LEVEL[i.place.level]} collation · {i.place.name}</span>
                        <StatusBadge status={i.status} />
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <StatusBadge status={null} />
              <p className="mt-2 text-sm text-muted">No signed result yet. When the presiding officer records the EC8A and rival agents co-sign it, it appears here.</p>
            </Card>
          )
        ) : (
          <>
            <Card>
              <Eyebrow>Polling units</Eyebrow>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Units" value={coverage.units} />
                <Stat label="Sealed" value={coverage.sealed} tone="sealed" />
                <Stat label="Witnessed only" value={coverage.witnessed} tone="witnessed" />
                <Stat label="Disputed" value={coverage.disputed} tone="disputed" />
              </div>
            </Card>
            {collation && <CollationPanel check={collation} />}
            <Card>
              <Eyebrow>{children[0] ? `${LEVEL[children[0].level]}s` : "Inside"}</Eyebrow>
              <ul className="mt-2 divide-y divide-line">
                {childSummaries(children, results).map((c) => (
                  <li key={c.place.code}>
                    <Link href={`/p/${c.place.code}`} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.place.name}</span>
                        <span className="block text-xs text-muted">
                          {c.place.level === "pu" ? <span className="hash">{c.place.code}</span> : `${c.sealed} sealed of ${c.reported} reported`}
                        </span>
                      </span>
                      {c.place.level === "pu" ? <StatusBadge status={c.status as Status} /> : c.disputed > 0 ? <StatusBadge status="disputed" /> : <span className="text-muted">›</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        {timeline.length > 0 && (
          <Card>
            <Eyebrow>Signed timeline</Eyebrow>
            <ol className="mt-3 space-y-3">
              {timeline.map((t) => (
                <li key={t.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {EVENT[t.type] ?? t.type}
                      {t.type === "transmission.attempted" ? ` — ${(t.payload as { outcome: string }).outcome}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(t.occurredAt).toLocaleString()} · {ROLE[t.role] ?? t.role}
                      {t.party ? ` (${t.party})` : ""} · {t.witnesses} co-signature{t.witnesses === 1 ? "" : "s"} · ledger <span className="hash">{shortHash(t.ledgerHash)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <p className="text-center text-xs text-muted">
          Every entry is signed and hash-chained. <Link href="/verify" className="underline">Verify the whole ledger</Link>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "sealed" | "witnessed" | "disputed" }) {
  const color = tone === "sealed" ? "text-sealed" : tone === "witnessed" ? "text-witnessed" : tone === "disputed" ? "text-disputed" : "text-ink";
  return (
    <div className="rounded-xl bg-paper p-3">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function CollationPanel({ check }: { check: CollationCheck }) {
  const bad = check.rows.filter((r) => r.status === "mismatch");
  return (
    <Card className={check.tamperSuspected ? "border-2 border-disputed bg-disputed-wash" : "border-sealed"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Eyebrow>Collation check</Eyebrow>
          <h2 className={`mt-1 text-xl font-bold ${check.tamperSuspected ? "text-disputed" : "text-sealed"}`}>
            {check.tamperSuspected ? `Tampering suspected: ${bad.length} row${bad.length === 1 ? " does" : "s do"} not match the sealed results` : "Collation matches every sealed result"}
          </h2>
          <p className="mt-1 text-sm text-muted">Entered by {check.officer} at {new Date(check.occurredAt).toLocaleString()}</p>
        </div>
      </div>
      {check.arithmetic.length > 0 && <p className="mt-3 text-sm text-disputed">The announced total does not equal the sum of its own rows.</p>}
      <ul className="mt-4 space-y-2">
        {check.rows.map((r) => (
          <li key={r.code} className={`rounded-xl p-3 ${r.status === "mismatch" ? "bg-card" : "bg-card/60"}`}>
            <div className="flex items-center justify-between gap-2">
              <Link href={`/p/${r.code}`} className="font-medium hover:underline">{r.name}</Link>
              <StatusBadge status={r.status} />
            </div>
            {r.divergences.length > 0 && (
              <ul className="mt-2 text-sm">
                {r.divergences.map((d) => (
                  <li key={d.field} className="flex justify-between">
                    <span>{d.field}</span>
                    <span>
                      announced <b className="text-disputed">{d.announced.toLocaleString()}</b> · sealed by rival agents <b className="text-sealed">{d.computed.toLocaleString()}</b>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** For a polling unit: did each collation level above it carry its sealed figures unchanged? */
async function inclusionChecks(pu: Place, ancestors: Place[]) {
  const out: { place: Place; status: "match" | "mismatch" | "unverified" }[] = [];
  for (const ancestor of [...ancestors].reverse()) {
    if (ancestor.level === "national") continue;
    const results = await getUnitResults(ancestor);
    const check = await getCollationCheck(ancestor, results);
    if (!check) continue;
    const row = check.rows.find((r) => pu.code === r.code || pu.code.startsWith(`${r.code}-`));
    if (row) out.push({ place: ancestor, status: row.status });
  }
  return out;
}
