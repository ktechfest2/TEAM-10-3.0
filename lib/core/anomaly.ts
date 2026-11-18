/**
 * Anomaly agent. Plain statistics, no model: it flags polling units for human review.
 * A flag is NOT an accusation. It can come from a data-entry error as easily as from a problem at the unit,
 * and every flag states the rule that raised it.
 */
export type UnitFigures = {
  code: string;
  /** Peers are units in the same ward. */
  group: string;
  registered: number;
  accredited: number;
  votes: Record<string, number>;
};

export type FlagKind = "accredited_over_registered" | "votes_over_accredited" | "turnout_outlier" | "share_outlier";
export type Flag = {
  code: string;
  kind: FlagKind;
  /** "impossible": the figures contradict each other. "outlier": unusual next to the unit's ward. */
  tier: "impossible" | "outlier";
  title: string;
  detail: string;
  /** For ranking inside a tier: bigger is stranger. */
  weight: number;
};

export const RULES: Record<FlagKind, { tier: Flag["tier"]; title: string; method: string }> = {
  accredited_over_registered: { tier: "impossible", title: "More accredited than registered", method: "Accredited voters exceed the unit's registered voters." },
  votes_over_accredited: { tier: "impossible", title: "More votes than accredited voters", method: "Valid votes for the listed parties exceed the accredited voters." },
  turnout_outlier: { tier: "outlier", title: "Turnout far from its ward", method: "Turnout differs from the ward median by 25 points or more, and by at least 4 robust deviations (median absolute deviation), among wards with 6 or more comparable units." },
  share_outlier: { tier: "outlier", title: "Party share far from its ward", method: "One party's share of the vote differs from the ward median by 35 points or more, and by at least 4.5 robust deviations, among wards with 6 or more comparable units." },
};

const MIN_PEERS = 6;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Robust z-score: how many median absolute deviations from the median. Floors the spread so flat wards do not explode. */
export function robustZ(value: number, peers: number[]): { z: number; median: number } {
  const m = median(peers);
  const mad = Math.max(median(peers.map((p) => Math.abs(p - m))), 0.02);
  return { z: (0.6745 * (value - m)) / mad, median: m };
}

/** A unit with no figures at all is missing data, not an outlier. */
const hasData = (u: UnitFigures) => u.accredited > 0 || sum(u.votes) > 0;

export function detectAnomalies(units: UnitFigures[]): Flag[] {
  const flags: Flag[] = [];
  const byGroup = new Map<string, UnitFigures[]>();
  for (const u of units) byGroup.set(u.group, [...(byGroup.get(u.group) ?? []), u]);

  for (const u of units) {
    if (!hasData(u)) continue;
    const total = sum(u.votes);
    if (u.registered > 0 && u.accredited > u.registered) {
      flags.push({ code: u.code, kind: "accredited_over_registered", tier: "impossible", title: RULES.accredited_over_registered.title, detail: `${u.accredited.toLocaleString("en-US")} accredited against ${u.registered.toLocaleString("en-US")} registered.`, weight: u.accredited / u.registered });
    }
    if (total > u.accredited) {
      flags.push({ code: u.code, kind: "votes_over_accredited", tier: "impossible", title: RULES.votes_over_accredited.title, detail: `${total.toLocaleString("en-US")} votes against ${u.accredited.toLocaleString("en-US")} accredited.${u.accredited === 0 ? " No accredited figure may have been recorded on the sheet." : ""}`, weight: u.accredited > 0 ? total / u.accredited : total });
    }
  }

  for (const peers of byGroup.values()) {
    const turnoutPeers = peers.filter((p) => p.registered >= 50 && hasData(p));
    if (turnoutPeers.length >= MIN_PEERS) {
      const rates = turnoutPeers.map((p) => p.accredited / p.registered);
      for (const u of turnoutPeers) {
        const rate = u.accredited / u.registered;
        const { z, median: m } = robustZ(rate, rates);
        if (Math.abs(z) >= 4 && Math.abs(rate - m) >= 0.25) {
          flags.push({ code: u.code, kind: "turnout_outlier", tier: "outlier", title: RULES.turnout_outlier.title, detail: `Turnout ${pct(rate)}; the ward's median is ${pct(m)}.`, weight: Math.abs(z) });
        }
      }
    }
    const sharePeers = peers.filter((p) => sum(p.votes) >= 30);
    if (sharePeers.length >= MIN_PEERS) {
      const parties = new Set(sharePeers.flatMap((p) => Object.keys(p.votes)));
      for (const u of sharePeers) {
        let worst: { party: string; share: number; med: number; z: number } | null = null;
        for (const party of parties) {
          const shares = sharePeers.map((p) => (p.votes[party] ?? 0) / sum(p.votes));
          const share = (u.votes[party] ?? 0) / sum(u.votes);
          const { z, median: med } = robustZ(share, shares);
          if (Math.abs(z) >= 4.5 && Math.abs(share - med) >= 0.35 && (!worst || Math.abs(z) > Math.abs(worst.z))) worst = { party, share, med, z };
        }
        if (worst) flags.push({ code: u.code, kind: "share_outlier", tier: "outlier", title: RULES.share_outlier.title, detail: `${worst.party} took ${pct(worst.share)} of the vote here; its ward median is ${pct(worst.med)}.`, weight: Math.abs(worst.z) });
      }
    }
  }

  return flags.sort((a, b) => (a.tier === b.tier ? b.weight - a.weight : a.tier === "impossible" ? -1 : 1));
}
