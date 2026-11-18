import { Logo } from "@/components/logo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Journey } from "@/components/journey";
import { LanguagePicker } from "@/components/language-picker";
import { MarginCard } from "@/components/margin-card";
import { Seal, type SealState } from "@/components/seal";
import { ShareButton } from "@/components/share-button";
import { Card, Eyebrow, FiguresTable, StatusBadge, TrustMeter, shortHash, type Status } from "@/components/ui";
import { ROLE_COLOR, type RoleKey } from "@/lib/roles";
import { t, type Lang, type MessageKey } from "@/lib/core/i18n";
import { joinList } from "@/lib/core/journey";
import { getLang } from "@/lib/server/lang";
import { flagsForResults } from "@/lib/server/anomaly-live";
import { getUnitJourney } from "@/lib/server/journey";
import { getMargin } from "@/lib/server/margin";
import { getUploadFailures } from "@/lib/server/uploads";
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
  type ResultVersion,
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

const ROLE_KEYS: Record<string, MessageKey | undefined> = { presiding_officer: "role.presiding_officer", party_agent: "role.party_agent", observer: "role.observer", citizen: "role.citizen", community_leader: "role.community_leader" };

export async function generateMetadata(props: PageProps<"/p/[code]">): Promise<Metadata> {
  const { code } = await props.params;
  const place = await getPlace(code);
  if (!place) return { title: "Not found" };
  return { title: place.name, description: `${place.name}: signed election results anyone can check on Tally.`, openGraph: { title: `${place.name} on Tally`, type: "website" }, twitter: { card: "summary_large_image" } };
}

function headline(best: ResultVersion | null | undefined, lang: Lang) {
  const parties = best ? joinList([...new Set(best.witnesses.filter((w) => w.party).map((w) => w.party as string))], lang) : "";
  if (!best) return { state: "none" as SealState, title: t(lang, "hero.none.title"), text: t(lang, "hero.none.text"), tone: "text-fg" };
  switch (best.trust.status) {
    case "sealed":
      return { state: "sealed" as SealState, title: t(lang, "hero.sealed.title"), text: t(lang, "hero.sealed.text", { parties }), tone: "text-sealed" };
    case "disputed":
      return { state: "disputed" as SealState, title: t(lang, "hero.disputed.title"), text: t(lang, "hero.disputed.text"), tone: "text-alarm" };
    case "witnessed":
      return { state: "witnessed" as SealState, title: t(lang, "hero.witnessed.title"), text: t(lang, "hero.witnessed.text", { parties }), tone: "text-amber" };
    default:
      return { state: "none" as SealState, title: t(lang, "hero.recorded.title"), text: t(lang, "hero.recorded.text"), tone: "text-fg" };
  }
}

export default async function PlacePage(props: PageProps<"/p/[code]">) {
  const { code } = await props.params;
  const lang = await getLang((await props.searchParams).lang);
  const place = await getPlace(code);
  if (!place) notFound();

  const [breadcrumb, children, results, timeline] = await Promise.all([getBreadcrumb(place), getChildren(code), getUnitResults(place), getTimeline(place)]);
  const [coverage, collation] = await Promise.all([getCoverage(place, results), getCollationCheck(place, results)]);
  const unit = place.level === "pu" ? results.get(code) : undefined;
  const journey = place.level === "pu" ? await getUnitJourney(place, breadcrumb, unit, lang) : [];
  const hero = place.level === "pu" ? headline(unit?.best, lang) : null;
  const [margin, uploads] = place.level === "pu" ? [null, null] : await Promise.all([getMargin(place, results), getUploadFailures(place)]);
  const figLabels = { totalValid: t(lang, "fig.totalValid"), rejected: t(lang, "fig.rejected"), accredited: t(lang, "fig.accredited") };
  // Statistical flags compare this unit with the other reported units in its ward.
  const ward = breadcrumb.find((b) => b.level === "ward");
  const unitFlags = unit?.best && ward ? (await flagsForResults(await getUnitResults(ward))).filter((f) => f.code === code) : [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link href="/"><Logo size={22} /></Link>
        <Link href="/app" className="text-sm font-bold text-blue">Open app ›</Link>
      </header>

      <nav className="flex flex-wrap gap-x-1.5 text-xs text-muted" aria-label="Breadcrumb">
        {breadcrumb.map((b) => (
          <span key={b.code}>
            <Link href={`/p/${b.code}`} className="hover:text-fg hover:underline">{b.name}</Link> ›
          </span>
        ))}
      </nav>
      <h1 className="font-display mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">{place.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {LEVEL[place.level]} · <span className="hash">{place.code}</span>
        {place.registered ? ` · ${place.registered.toLocaleString("en-US")} registered voters` : ""}
      </p>

      {place.level === "pu" && <div className="mt-4"><LanguagePicker lang={lang} label={t(lang, "language")} draft={t(lang, "draft")} /></div>}

      <div className="mt-6 space-y-4">
        {place.level === "pu" && hero ? (
          <>
            <Card className={unit?.best?.trust.status === "disputed" ? "border-alarm/60" : unit?.best?.trust.status === "sealed" ? "border-sealed/50" : ""}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Seal signed={unit?.best ? [...new Set(unit.best.witnesses.filter((w) => w.party).map((w) => w.party as string))] : []} state={hero.state} className="w-40 shrink-0 sm:w-44" />
                <div className="min-w-0">
                  <h2 className={`font-display text-2xl leading-tight font-extrabold ${hero.tone}`}>{hero.title}</h2>
                  <p className="mt-1.5 text-sm text-muted">{hero.text}</p>
                </div>
              </div>
              {unit?.best && (
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  <FiguresTable totals={unit.best.figures} labels={figLabels} />
                  <div className="space-y-4">
                    <TrustMeter probability={unit.best.trust.probability} status={unit.best.trust.status} label={t(lang, "ui.trust")} />
                    <div>
                      <Eyebrow>{t(lang, "ui.signedBy")}</Eyebrow>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {unit.best.witnesses.map((w) => (
                          <li key={w.actorId} className={`flex justify-between gap-2 border-l-4 pl-2.5 ${ROLE_COLOR[w.role as RoleKey]?.border ?? "border-l-line"}`}>
                            <span>
                              {w.party ? <span className="font-bold">{w.party} </span> : null}
                              <span className="text-muted">{ROLE_KEYS[w.role] ? t(lang, ROLE_KEYS[w.role]!) : (ROLE[w.role] ?? w.role)}</span>
                            </span>
                            <span className="text-muted">{new Date(w.signedAt).toLocaleTimeString("en-NG", { timeStyle: "short" })}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {unit?.best && (
                <div className="mt-5 border-t border-line pt-4">
                  <ShareButton code={place.code} lang={lang} title={`${place.name} on Tally`} text={`${hero.title}.`} shareLabel={t(lang, "ui.share")} cardLabel={t(lang, "ui.card")} copiedLabel={t(lang, "ui.copied")} />
                </div>
              )}
            </Card>

            <Card>
              <Eyebrow>{t(lang, "j.title")}</Eyebrow>
              <p className="mt-1 text-sm text-muted">{t(lang, "j.sub")}</p>
              <Journey steps={journey} />
            </Card>

            {unitFlags.length > 0 && (
              <Card className="border-amber/40">
                <Eyebrow>Flagged for review</Eyebrow>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {unitFlags.map((f) => (
                    <li key={f.kind}>
                      <b>{f.title}.</b> <span className="text-muted">{f.detail}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">A statistical flag, not an accusation. It can come from a data-entry error as easily as from a problem at the unit. <Link href="/replay" className="text-blue underline">How flags are raised</Link></p>
              </Card>
            )}

            {unit?.best && (
              <Card>
                <details>
                  <summary className="cursor-pointer text-sm font-bold">Proof: why you can trust this</summary>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {unit.best.trust.trace.map((t) => (
                      <li key={t.id + t.label} className="flex justify-between gap-3">
                        <span>{t.label} <span className="text-muted">· {t.detail}</span></span>
                        <span className={t.effect >= 0 ? "text-sealed" : "text-alarm"}>{t.effect >= 0 ? "+" : ""}{t.effect.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
                    <p>Read by: {unit.best.readBy === "model" ? "AI reader, confirmed by the officer" : "entered by the officer"}</p>
                    <p>Content hash <span className="hash text-fg">{unit.best.contentHash}</span></p>
                    {unit.best.photoSha256 && (
                      <p>
                        EC8A photo <a className="text-blue underline" href={`/api/media/${unit.best.photoSha256}`}>view</a> · fingerprint <span className="hash">{shortHash(unit.best.photoSha256)}</span>
                      </p>
                    )}
                  </div>
                </details>
              </Card>
            )}

            {unit && unit.versions.length > 1 && (
              <Card className="border-alarm/50">
                <Eyebrow>Other signed versions</Eyebrow>
                <p className="mt-1 text-sm text-muted">Every version stays on the ledger as evidence. Nothing is overwritten.</p>
                {unit.versions
                  .filter((v) => v.contentHash !== unit.best!.contentHash)
                  .map((v) => (
                    <div key={v.contentHash} className="mt-3 rounded-xl bg-raised p-3">
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
          </>
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
            {margin && uploads && <MarginCard margin={margin} uploads={uploads} />}
            {uploads && uploads.units.length > 0 && (
              <Card>
                <Eyebrow>Upload failures · most certified first</Eyebrow>
                <ul className="mt-2 divide-y divide-line">
                  {uploads.units.map((u) => (
                    <li key={u.code}>
                      <Link href={`/p/${u.code}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{u.name}</span>
                          <span className="block text-xs text-muted">{u.level === "claimed" ? "Reported by the officer only" : `Seen by ${u.witnesses.join(", ")}`}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${u.level === "certified" ? "bg-sealed-wash text-sealed" : u.level === "witnessed" ? "bg-amber-wash text-amber" : "bg-raised text-muted"}`}>
                          {u.level === "certified" ? "Certified" : u.level === "witnessed" ? "1 witness" : "Claimed"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
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
            <details>
              <summary className="cursor-pointer text-sm font-bold">Signed record ({timeline.length})</summary>
              <ol className="mt-3 space-y-3">
                {timeline.map((t) => (
                  <li key={t.id} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ROLE_COLOR[t.role as RoleKey]?.dot ?? "bg-fg"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {EVENT[t.type] ?? t.type}
                        {t.type === "transmission.attempted" ? ` — ${(t.payload as { outcome: string }).outcome}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(t.occurredAt).toLocaleString("en-NG")} · {ROLE[t.role] ?? t.role}
                        {t.party ? ` (${t.party})` : ""} · {t.witnesses} co-signature{t.witnesses === 1 ? "" : "s"} · ledger <span className="hash">{shortHash(t.ledgerHash)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
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
  const color = tone === "sealed" ? "text-sealed" : tone === "witnessed" ? "text-amber" : tone === "disputed" ? "text-alarm" : "text-fg";
  return (
    <div className="rounded-xl bg-raised p-3">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString("en-US")}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function CollationPanel({ check }: { check: CollationCheck }) {
  const bad = check.rows.filter((r) => r.status === "mismatch");
  return (
    <Card className={check.tamperSuspected ? "border-2 border-alarm bg-alarm-wash" : "border-sealed/50"}>
      <Eyebrow>Collation check</Eyebrow>
      <h2 className={`mt-1 text-xl font-bold ${check.tamperSuspected ? "text-alarm" : "text-sealed"}`}>
        {check.tamperSuspected ? `Tampering suspected: ${bad.length} row${bad.length === 1 ? " does" : "s do"} not match the sealed results` : "Collation matches every sealed result"}
      </h2>
      <p className="mt-1 text-sm text-muted">Entered by {check.officer} at {new Date(check.occurredAt).toLocaleString("en-NG")}</p>
      {check.arithmetic.length > 0 && <p className="mt-3 text-sm text-alarm">The announced total does not equal the sum of its own rows.</p>}
      <ul className="mt-4 space-y-2">
        {check.rows.map((r) => (
          <li key={r.code} className="rounded-xl bg-raised p-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/p/${r.code}`} className="font-medium hover:underline">{r.name}</Link>
              <StatusBadge status={r.status} />
            </div>
            {r.divergences.length > 0 && (
              <ul className="mt-2 text-sm">
                {r.divergences.map((d) => (
                  <li key={d.field} className="flex justify-between gap-3">
                    <span>{d.field}</span>
                    <span className="text-right">
                      announced <b className="text-alarm">{d.announced.toLocaleString("en-US")}</b> · sealed by rival agents <b className="text-sealed">{d.computed.toLocaleString("en-US")}</b>
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
