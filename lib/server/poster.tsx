import "server-only";
import { ImageResponse } from "next/og";
import { t, type Lang } from "@/lib/core/i18n";
import { joinList } from "@/lib/core/journey";
import { getBreadcrumb, getCoverage, getPlace, getUnitResults } from "./views";

const C = { bg: "#000000", fg: "#E9EAEC", muted: "#9A9EA6", line: "#26292E", sealed: "#3DDC97", amber: "#FFB93B", alarm: "#FF6B6B", blue: "#6AA9FF", pink: "#FF63AE", orange: "#FF8F3F", thumb: "#A394FF" };
type Format = "story" | "og";
type State = "none" | "witnessed" | "sealed" | "disputed";

type Facts = { title: string; place: string; where: string; state: State; strokes: number; headline: string; sub: string; figures: [string, number][]; accent: string };

async function loadFacts(code: string, lang: Lang): Promise<Facts | null> {
  const place = await getPlace(code);
  if (!place) return null;
  const breadcrumb = await getBreadcrumb(place);
  const where = breadcrumb.filter((b) => b.level === "ward" || b.level === "lga").map((b) => b.name).reverse().join(" · ");
  const results = await getUnitResults(place);

  if (place.level !== "pu") {
    const cov = await getCoverage(place, results);
    return { title: place.name, place: place.name, where, state: cov.disputed ? "disputed" : cov.sealed ? "sealed" : "none", strokes: Math.min(3, cov.sealed ? 2 : 0), headline: `${cov.sealed.toLocaleString("en-US")} of ${cov.units.toLocaleString("en-US")} polling units sealed.`, sub: cov.disputed ? `${cov.disputed} disputed. Every number is signed by rival parties and open to check.` : "Every number is signed by rival parties and open to check.", figures: [], accent: C.sealed };
  }

  const best = results.get(code)?.best;
  if (!best) return { title: place.name, place: place.name, where, state: "none", strokes: 0, headline: t(lang, "p.waiting"), sub: t(lang, "hero.none.text"), figures: [], accent: C.muted };
  const parties = joinList([...new Set(best.witnesses.filter((w) => w.party).map((w) => w.party as string))], lang);
  const s = best.trust.status;
  const state: State = s === "sealed" ? "sealed" : s === "disputed" ? "disputed" : s === "witnessed" ? "witnessed" : "none";
  const figures = Object.entries(best.figures.votes).sort((a, b) => b[1] - a[1]).slice(0, 4) as [string, number][];
  return {
    title: place.name,
    place: place.name,
    where,
    state,
    strokes: Math.min(3, new Set(best.witnesses.filter((w) => w.party).map((w) => w.party)).size),
    figures,
    headline: t(lang, state === "sealed" ? "p.sealed" : state === "disputed" ? "p.disputed" : state === "witnessed" ? "p.witnessed" : "p.recorded"),
    sub: state === "sealed" ? t(lang, "hero.sealed.text", { parties }) : state === "disputed" ? t(lang, "hero.disputed.text") : state === "witnessed" ? t(lang, "hero.witnessed.text", { parties }) : t(lang, "hero.recorded.text"),
    accent: state === "sealed" ? C.sealed : state === "disputed" ? C.alarm : state === "witnessed" ? C.amber : C.muted,
  };
}

function Seal({ width, state, strokes }: { width: number; state: State; strokes: number }) {
  const paths = ["M34 16 C35 38 33 66 35 86", "M72 14 C71 38 73 64 71 87", "M110 16 C112 40 109 66 111 86"];
  return (
    <svg width={width} height={width * 0.64} viewBox="0 0 160 100">
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" strokeWidth={9} strokeLinecap="round" stroke={i < strokes ? C.fg : C.line} strokeDasharray={i < strokes ? undefined : "1 15"} />
      ))}
      {state === "sealed" && <path d="M10 76 C48 62 106 40 150 22" fill="none" strokeWidth={10} strokeLinecap="round" stroke={C.sealed} />}
      {state === "witnessed" && <path d="M10 76 C48 62 106 40 150 22" fill="none" strokeWidth={9} strokeLinecap="round" stroke={C.amber} strokeDasharray="4 12" />}
      {state === "disputed" && <path d="M10 76 L52 58 M64 53 L86 44 M98 39 L150 22" fill="none" strokeWidth={10} strokeLinecap="round" stroke={C.alarm} />}
      {state === "none" && <path d="M10 76 C48 62 106 40 150 22" fill="none" strokeWidth={9} strokeLinecap="round" stroke={C.line} strokeDasharray="2 14" />}
    </svg>
  );
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 120 80">
      <path d="M22 12 C23 28 21 50 23 68" fill="none" strokeWidth={10} strokeLinecap="round" stroke={C.blue} />
      <path d="M48 10 C47 28 49 48 47 69" fill="none" strokeWidth={10} strokeLinecap="round" stroke={C.pink} />
      <path d="M74 12 C76 30 73 50 75 68" fill="none" strokeWidth={10} strokeLinecap="round" stroke={C.orange} />
      <path d="M100 11 C101 28 99 50 101 68" fill="none" strokeWidth={10} strokeLinecap="round" stroke={C.thumb} />
      <path d="M6 60 C36 47 78 31 116 17" fill="none" strokeWidth={10} strokeLinecap="round" stroke={C.sealed} />
    </svg>
  );
}

/** The share card: a 9:16 story for WhatsApp Status, or the 1.91:1 link preview. Built from the same facts as the page. */
export async function renderPoster(code: string, format: Format, host?: string, lang: Lang = "en") {
  const f = await loadFacts(code, lang);
  const story = format === "story";
  const W = story ? 1080 : 1200;
  const H = story ? 1920 : 630;
  const url = `${host ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "tally"}/p/${code}`;
  const glow = `radial-gradient(ellipse at 15% 0%, rgba(106,169,255,0.28), rgba(0,0,0,0) 55%), radial-gradient(ellipse at 95% 25%, rgba(255,99,174,0.22), rgba(0,0,0,0) 55%)`;

  if (!f) {
    return new ImageResponse(
      (
        <div style={{ width: W, height: H, background: C.bg, color: C.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>Polling unit not found</div>
      ),
      { width: W, height: H, status: 404 },
    );
  }

  const figures = f.figures.map(([p, v]) => (
    <div key={p} style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: story ? 52 : 30, padding: story ? "14px 0" : "5px 0", borderBottom: `2px solid ${C.line}` }}>
      <span style={{ color: C.muted, fontWeight: 700 }}>{p}</span>
      <span style={{ fontWeight: 800 }}>{v.toLocaleString("en-US")}</span>
    </div>
  ));

  return new ImageResponse(
    story ? (
      <div style={{ width: W, height: H, background: C.bg, backgroundImage: glow, color: C.fg, display: "flex", flexDirection: "column", padding: 90, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Mark size={64} />
          <span style={{ marginLeft: 22, fontSize: 56, fontWeight: 800 }}>Tally</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Seal width={420} state={f.state} strokes={f.strokes} />
          <div style={{ display: "flex", marginTop: 50, fontSize: 112, fontWeight: 800, lineHeight: 1.02, color: f.accent === C.muted ? C.fg : f.accent }}>{f.headline}</div>
          <div style={{ display: "flex", marginTop: 34, fontSize: 40, lineHeight: 1.35, color: C.muted }}>{f.sub}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {figures}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
            <span style={{ display: "flex", fontSize: 46, fontWeight: 800 }}>{f.place}</span>
            <span style={{ display: "flex", fontSize: 32, color: C.muted, marginTop: 8 }}>{f.where}</span>
            <span style={{ display: "flex", fontSize: 34, color: C.blue, marginTop: 30 }}>{t(lang, "p.check")}: {url}</span>
          </div>
        </div>
      </div>
    ) : (
      <div style={{ width: W, height: H, background: C.bg, backgroundImage: glow, color: C.fg, display: "flex", padding: 60, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Mark size={40} />
            <span style={{ marginLeft: 16, fontSize: 36, fontWeight: 800 }}>Tally</span>
          </div>
          <div style={{ display: "flex", marginTop: 34, fontSize: 64, fontWeight: 800, lineHeight: 1.05, color: f.accent === C.muted ? C.fg : f.accent }}>{f.headline}</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 28, lineHeight: 1.35, color: C.muted }}>{f.sub}</div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 30, fontWeight: 700 }}>{f.place}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 340 }}>
          <Seal width={300} state={f.state} strokes={f.strokes} />
          <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 22 }}>{figures}</div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
