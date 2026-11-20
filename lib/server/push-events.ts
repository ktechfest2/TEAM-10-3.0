import "server-only";
import type { SignedEvent } from "@/lib/core/events";
import { sqlClient as sql } from "@/lib/db/client";
import { getCollationCheck, getPlace, getUnitResults, isSimulated } from "./views";
import { pushToTopic, type PushPayload } from "./push";

const joinParties = (list: string[]) => (list.length < 2 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);

/**
 * Turns an accepted ledger event into at most a few push alerts.
 * Read-only: a push failure is logged and never allowed to affect the sync result.
 */
export async function notifyEvent(event: SignedEvent): Promise<void> {
  const place = await getPlace(event.placeCode);
  if (!place) return;
  const label = place.name;

  switch (event.type) {
    case "pu.opened": {
      await pushToTopic(
        `place:${event.placeCode}`,
        { title: `Voting started at ${label}`, body: "The presiding officer signed the unit open.", url: `/p/${event.placeCode}`, kind: "green", tag: event.contentHash },
        event.contentHash,
      );
      break;
    }
    case "pu.closed": {
      await pushToTopic(
        `place:${event.placeCode}`,
        { title: `Voting closed at ${label}`, body: "The count can begin.", url: `/p/${event.placeCode}`, kind: "grey", tag: event.contentHash },
        event.contentHash,
      );
      break;
    }
    case "pu.relocated": {
      const p = event.payload as { toName?: string };
      const payload: PushPayload = {
        title: `${label} has moved`,
        body: `Vote at ${p.toName ?? "the new site"}.`,
        url: `/p/${event.placeCode}`,
        kind: "amber",
        tag: event.contentHash,
      };
      await pushToTopic(`place:${event.placeCode}`, payload, event.contentHash);
      await pushToTopic("mission", payload, event.contentHash);
      break;
    }
    case "result.declared": {
      const best = (await getUnitResults(place)).get(event.placeCode)?.best;
      if (!best) break;
      // A sealed result is announced by notifySeal when the rival co-signature reaches the ledger.
      if (best.trust.status === "sealed") break;
      const sim = isSimulated(best) ? "Simulated · " : "";
      const disputed = best.trust.status === "disputed";
      await pushToTopic(
        `place:${event.placeCode}`,
        {
          title: `${sim}${label}: ${disputed ? "disputed" : "result signed"}`,
          body: disputed ? "Witnesses signed different figures. Every version is kept." : "A rival party's signature still seals it.",
          url: `/p/${event.placeCode}`,
          kind: disputed ? "red" : "amber",
          tag: event.contentHash,
        },
        event.contentHash,
      );
      if (best.trust.status === "disputed") {
        await pushToTopic(
          "mission",
          { title: `Disputed result: ${label}`, body: "Witnesses signed different figures. Every version is kept.", url: `/p/${event.placeCode}`, kind: "red", tag: `${event.contentHash}:disputed` },
          `${event.contentHash}:disputed`,
        );
      }
      break;
    }
    case "collation.entered": {
      const check = await getCollationCheck(place, await getUnitResults(place));
      if (!check) break;
      const sim = check.officer.startsWith("DEMO ") ? "Simulated · " : "";
      if (check.tamperSuspected) {
        const bad = check.rows.find((r) => r.status === "mismatch");
        const d = bad?.divergences[0];
        await pushToTopic(
          "mission",
          {
            title: `${sim}Tampering suspected: ${label}`,
            body: bad && d
              ? `${bad.name}: ${d.field} announced ${d.announced.toLocaleString("en-US")}, sealed by rival agents ${d.computed.toLocaleString("en-US")}.`
              : "Announced totals do not match the sealed results.",
            url: `/p/${place.code}`,
            kind: "red",
            tag: event.contentHash,
          },
          event.contentHash,
        );
      } else {
        await pushToTopic(
          "mission",
          {
            title: `${sim}Collation matches: ${label}`,
            body: `${check.rows.length} row${check.rows.length === 1 ? "" : "s"} equal the sealed unit results.`,
            url: `/p/${place.code}`,
            kind: "green",
            tag: event.contentHash,
          },
          event.contentHash,
        );
      }
      break;
    }
    case "transmission.attempted": {
      const p = event.payload as { outcome?: string };
      if (p.outcome === "failed") {
        await pushToTopic(
          `place:${event.placeCode}`,
          {
            title: `IReV upload failed: ${label}`,
            body: "The officer recorded the failure. Agents who saw it can certify it.",
            url: `/p/${event.placeCode}`,
            kind: "amber",
            tag: event.contentHash,
          },
          event.contentHash,
        );
      }
      break;
    }
    case "incident.reported": {
      const p = event.payload as { text?: string };
      await pushToTopic(
        "mission",
        {
          title: `Incident reported: ${label}`,
          body: (p.text ?? "A signed incident report was added.").slice(0, 160),
          url: `/p/${event.placeCode}`,
          kind: "amber",
          tag: event.contentHash,
        },
        event.contentHash,
      );
      break;
    }
    case "cancellation.recorded": {
      await pushToTopic(
        "mission",
        { title: `Result cancelled: ${label}`, body: "A signed cancellation record was added.", url: `/p/${event.placeCode}`, kind: "amber", tag: event.contentHash },
        event.contentHash,
      );
      break;
    }
  }
}

/** Called when a co-signature is accepted: announce a result that has just crossed from signed to sealed. */
export async function notifySeal(contentHash: string): Promise<void> {
  const [row] = await sql<{ place_code: string }[]>`select place_code from events where content_hash = ${contentHash} and type = 'result.declared' limit 1`;
  if (!row) return;
  const place = await getPlace(row.place_code);
  if (!place) return;
  const best = (await getUnitResults(place)).get(place.code)?.best;
  if (!best || best.trust.status !== "sealed") return;
  const signers = [...new Set(best.witnesses.filter((w) => w.party).map((w) => w.party as string))];
  const sim = isSimulated(best) ? "Simulated · " : "";
  await pushToTopic(
    `place:${place.code}`,
    {
      title: `${sim}${place.name}: result sealed`,
      body: `${joinParties(signers)} agents signed the same figures.`,
      url: `/p/${place.code}`,
      kind: "green",
      tag: `${contentHash}:sealed`,
    },
    `${contentHash}:sealed`,
  );
}
