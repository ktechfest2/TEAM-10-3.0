/**
 * Seeds the real FCT place hierarchy (national → FCT → 6 area councils → wards → 2,822 polling units)
 * and the public 2023 presidential polling-unit figures used as an independent reference.
 * Source: mundus01/irev-2023-results-map (sums of IReV polling-unit sheets), credited in README.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

type Row = {
  pu_code: string;
  name: string;
  lga_code: string;
  lga_name: string;
  ward_code: string;
  ward_name: string;
  lat: number | null;
  lng: number | null;
  apc: number;
  lp: number;
  pdp: number;
  nnpp: number;
  accredited: number;
  registered: number;
  source: string;
};

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, prepare: !url.includes("-pooler") });
const rows = JSON.parse(readFileSync("data/fct-2023-pu-results.json", "utf8")) as Row[];
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const places = new Map<string, { code: string; level: string; parent_code: string | null; name: string; lat: number | null; lng: number | null; registered: number | null }>();
places.set("NG", { code: "NG", level: "national", parent_code: null, name: "Nigeria", lat: 9.08, lng: 7.4, registered: null });
places.set("37", { code: "37", level: "state", parent_code: "NG", name: "Federal Capital Territory", lat: 9.06, lng: 7.49, registered: null });

for (const r of rows) {
  const lga = `37-${r.lga_code}`;
  const ward = `${lga}-${r.ward_code}`;
  if (!places.has(lga)) places.set(lga, { code: lga, level: "lga", parent_code: "37", name: title(r.lga_name), lat: null, lng: null, registered: null });
  if (!places.has(ward)) places.set(ward, { code: ward, level: "ward", parent_code: lga, name: title(r.ward_name), lat: null, lng: null, registered: null });
  places.set(r.pu_code, { code: r.pu_code, level: "pu", parent_code: ward, name: title(r.name), lat: r.lat, lng: r.lng, registered: r.registered });
}

await sql.begin(async (tx) => {
  const all = [...places.values()];
  for (let i = 0; i < all.length; i += 1000) {
    await tx`insert into places ${tx(all.slice(i, i + 1000))} on conflict (code) do update set name = excluded.name, lat = excluded.lat, lng = excluded.lng, registered = excluded.registered`;
  }
  const refs = rows.map((r) => ({
    pu_code: r.pu_code,
    votes: tx.json({ APC: r.apc, LP: r.lp, PDP: r.pdp, NNPP: r.nnpp }),
    accredited: r.accredited,
    registered: r.registered,
    source: "IReV 2023 (via mundus01/irev-2023-results-map)",
  }));
  for (let i = 0; i < refs.length; i += 1000) {
    await tx`insert into reference_2023 ${tx(refs.slice(i, i + 1000))} on conflict (pu_code) do nothing`;
  }
});

const [{ count }] = await sql`select count(*)::int as count from places`;
console.log(`Seeded ${count} places and ${rows.length} reference results`);
await sql.end();
