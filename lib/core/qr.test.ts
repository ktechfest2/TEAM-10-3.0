import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { generateKeyPair } from "./crypto";
import { cosign, signEvent, verifyCosignature, verifySignedEvent } from "./events";
import { decodeQr, encodeCosignatureQr, encodeEventQr } from "./qr";

const officer = generateKeyPair();
const figures = { votes: { APC: 143, LP: 27, PDP: 86, NNPP: 4 }, accredited: 266, rejected: 6, totalValid: 260 };
const result = () =>
  signEvent({ id: randomUUID(), type: "result.declared", placeCode: "37-02-04-011", payload: { figures, readBy: "model", photoSha256: "a".repeat(64) }, occurredAt: new Date().toISOString(), authorKey: officer.publicKeyHex }, officer.secretKeyHex);

describe("event QR", () => {
  it("round-trips a signed result and it still verifies", () => {
    const e = result();
    const msg = decodeQr(encodeEventQr(e));
    expect(msg?.k).toBe("ev");
    if (msg?.k !== "ev") return;
    expect(msg.e).toEqual(e);
    expect(verifySignedEvent(msg.e)).toEqual({ ok: true });
  });

  it("does not carry the content hash: the receiver recomputes it", () => {
    const e = result();
    expect(encodeEventQr(e)).not.toContain(e.contentHash);
  });

  it("fails verification if anyone changes a figure inside the code", () => {
    const text = encodeEventQr(result()).replace("143", "243");
    const msg = decodeQr(text);
    expect(msg?.k).toBe("ev");
    if (msg?.k === "ev") expect(verifySignedEvent(msg.e).ok).toBe(false);
  });

  it("is small enough for a camera to read off a phone screen", () => {
    const { version, modules } = QRCode.create(encodeEventQr(result()), { errorCorrectionLevel: "L" });
    // The first format was version 24 (113 modules) at level M, about 2.9 px per module on a phone.
    expect(version).toBeLessThanOrEqual(16);
    expect(modules.size).toBeLessThanOrEqual(81);
  });
});

describe("co-signature QR", () => {
  it("round-trips and verifies, with the witness's name and party", () => {
    const agent = generateKeyPair();
    const e = result();
    const c = cosign(e.contentHash, agent.secretKeyHex, agent.publicKeyHex, new Date().toISOString());
    const msg = decodeQr(encodeCosignatureQr(c, "Ngozi Adeyemi", "PDP"));
    expect(msg?.k).toBe("cs");
    if (msg?.k !== "cs") return;
    expect(msg.c).toEqual(c);
    expect(msg.n).toBe("Ngozi Adeyemi");
    expect(msg.p).toBe("PDP");
    expect(verifyCosignature(msg.c)).toBe(true);
  });
});

describe("decoding", () => {
  it("still reads the first (TALLY1) format", () => {
    const e = result();
    const v1 = "TALLY1:" + btoa(unescape(encodeURIComponent(JSON.stringify({ k: "ev", e })))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    const msg = decodeQr(v1);
    expect(msg?.k === "ev" && msg.e.contentHash).toBe(e.contentHash);
  });
  it("rejects anything that is not a Tally code", () => {
    for (const bad of ["", "hello", "https://example.com", "TALLY2:", "TALLY2:[1,2", 'TALLY2:["e","x"]', 'TALLY2:["z"]']) expect(decodeQr(bad)).toBeNull();
  });
});
